const flat = require('flat');
const Boom = require('boom');
const mongoose = require('mongoose');
const moment = require('moment');
const path = require('path');
const os = require('os');
const Contract = require('../models/Contract');
const User = require('../models/User');
const Drive = require('../models/Google/Drive');
const ESign = require('../models/ESign');
const EventHelper = require('./events');
const { addFile } = require('./gdriveStorage');
const { CUSTOMER_CONTRACT, COMPANY_CONTRACT } = require('./constants');
const { createAndReadFile } = require('./file');
const ESignHelper = require('../helpers/eSign');

exports.endContract = async (contractId, contractToEnd, credentials) => {
  const contract = await Contract.findOne({ _id: contractId });
  if (!contract) return null;

  contract.endDate = contractToEnd.endDate;
  contract.endNotificationDate = contractToEnd.endNotificationDate;
  contract.endReason = contractToEnd.endReason;
  contract.otherMisc = contractToEnd.otherMisc;
  // End last version
  contract.versions[contract.versions.length - 1].endDate = contractToEnd.endDate;
  await contract.save();

  // Update inactivityDate if all contracts are ended
  const userContracts = await Contract.find({ user: contract.user });
  const hasActiveContracts = userContracts.some(c => !c.endDate);
  if (!hasActiveContracts) {
    await User.findOneAndUpdate(
      { _id: contract.user },
      { $set: { inactivityDate: moment().add('1', 'months').startOf('M').toDate() } }
    );
  }

  await EventHelper.unassignInterventionsOnContractEnd(contract, credentials);
  await EventHelper.removeEventsExceptInterventionsOnContractEnd(contract, credentials);
  await EventHelper.updateAbsencesOnContractEnd(contract.user, contract.endDate, credentials);

  return contract;
};

exports.createVersion = async (contractId, newVersion) => {
  if (newVersion.signature) {
    const doc = await ESignHelper.generateSignatureRequest(newVersion.signature);
    if (doc.data.error) throw Boom.badRequest(`Eversign: ${doc.data.error.type}`);

    newVersion.signature = { eversignId: doc.data.document_hash };
  }
  const contract = await Contract.findOneAndUpdate(
    { _id: contractId },
    { $push: { versions: newVersion } },
    { new: true, autopopulate: false }
  );

  if (contract.versions.length > 1) {
    await exports.updatePreviousVersion(contract, contract.versions.length - 1, newVersion.startDate);
  }

  return contract;
};

exports.updatePreviousVersion = async (contract, versionIndex, versionStartDate) => {
  const previousVersionId = contract.versions[versionIndex - 1]._id;
  const previousVersionStartDate = moment(versionStartDate).subtract(1, 'd').endOf('d').toISOString();
  await Contract.updateOne(
    { _id: contract._id },
    { $set: { 'versions.$[version].endDate': previousVersionStartDate } },
    { arrayFilters: [{ 'version._id': mongoose.Types.ObjectId(previousVersionId) }] }
  );
};

exports.updateVersion = async (contractId, versionId, versionToUpdate) => {
  const payload = { 'versions.$[version]': { ...versionToUpdate } };
  const contract = await Contract.findOneAndUpdate(
    { _id: contractId },
    { $set: flat(payload) },
    {
      // Conversion to objectIds is mandatory as we use directly mongo arrayFilters
      arrayFilters: [{ 'version._id': mongoose.Types.ObjectId(versionId) }],
    }
  ).lean();

  if (versionToUpdate.startDate) {
    const index = contract.versions.findIndex(ver => ver._id.toHexString() === versionId);
    if (index === 0) {
      await Contract.updateOne({ _id: contractId }, { startDate: versionToUpdate.startDate });
    } else {
      await exports.updatePreviousVersion(contract, index, versionToUpdate.startDate);
    }
  }

  return contract;
};

exports.createAndSaveFile = async (administrativeKeys, params, payload) => {
  const uploadedFile = await addFile({
    driveFolderId: params.driveId,
    name: payload.fileName || payload[administrativeKeys[0]].hapi.filename,
    type: payload['Content-Type'],
    body: payload[administrativeKeys[0]],
  });
  const driveFileInfo = await Drive.getFileById({ fileId: uploadedFile.id });

  let file = {};
  if (payload.type) {
    if (payload.type === COMPANY_CONTRACT) {
      file = { 'versions.$[version]': { auxiliaryDoc: { driveId: uploadedFile.id, link: driveFileInfo.webViewLink } } };
    }
    if (payload.type === CUSTOMER_CONTRACT) {
      file = {
        'versions.$[version]': {
          customerDoc: { driveId: uploadedFile.id, link: driveFileInfo.webViewLink },
          auxiliaryDoc: { driveId: uploadedFile.id, link: driveFileInfo.webViewLink },
        },
      };
    }
  } else {
    file = { 'versions.$[version]': { driveId: uploadedFile.id, link: driveFileInfo.webViewLink } };
  }
  await Contract.findOneAndUpdate(
    { _id: params._id },
    { $set: flat(file) },
    {
      new: true,
      arrayFilters: [{ 'version._id': mongoose.Types.ObjectId(payload.versionId) }],
      autopopulate: false,
    }
  );

  return uploadedFile;
};

exports.saveCompletedContract = async (everSignDoc) => {
  const finalPDF = await ESign.downloadFinalDocument(everSignDoc.data.document_hash);
  const tmpPath = path.join(os.tmpdir(), `signedDoc-${moment().format('DDMMYYYY-HHmm')}.pdf`);
  const file = await createAndReadFile(finalPDF.data, tmpPath);
  let payload = {};
  if (everSignDoc.data.meta.type === CUSTOMER_CONTRACT) {
    const addFilePromises = [
      addFile({
        driveFolderId: everSignDoc.data.meta.auxiliaryDriveId,
        name: everSignDoc.data.title,
        type: 'application/pdf',
        body: file,
      }),
      addFile({
        driveFolderId: everSignDoc.data.meta.customerDriveId,
        name: everSignDoc.data.title,
        type: 'application/pdf',
        body: file,
      }),
    ];
    const [auxiliaryDoc, customerDoc] = await Promise.all(addFilePromises);
    const fileInfoPromises = [Drive.getFileById({ fileId: auxiliaryDoc.id }), Drive.getFileById({ fileId: customerDoc.id })];
    const [auxiliaryDocInfo, customerDocInfo] = await Promise.all(fileInfoPromises);
    payload = {
      'versions.$': {
        auxiliaryDoc: { driveId: auxiliaryDoc.id, link: auxiliaryDocInfo.webViewLink },
        customerDoc: { driveId: customerDoc.id, link: customerDocInfo.webViewLink },
      },
    };
  } else {
    const auxiliaryDoc = await addFile({
      driveFolderId: everSignDoc.data.meta.auxiliaryDriveId,
      name: everSignDoc.data.title,
      type: 'application/pdf',
      body: file,
    });
    const auxiliaryDocInfo = await Drive.getFileById({ fileId: auxiliaryDoc.id });
    payload = {
      'versions.$': {
        auxiliaryDoc: { driveId: auxiliaryDoc.id, link: auxiliaryDocInfo.webViewLink },
      },
    };
  }
  await Contract.findOneAndUpdate({ 'versions.signature.eversignId': everSignDoc.data.document_hash }, { $set: flat(payload) }, { new: true });
};
