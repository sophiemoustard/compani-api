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
const Customer = require('../models/Customer');
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

  let contract = await Contract.findOneAndUpdate(
    { _id: contractId },
    { $push: { versions: newVersion } },
    { new: true, autopopulate: false }
  ).lean();
  if (!contract) return null;

  if (contract.versions.length > 1) {
    contract = await exports.updatePreviousVersion(contract, contract.versions.length - 1, newVersion.startDate);
  }

  return contract;
};

exports.updatePreviousVersion = async (contract, versionIndex, versionStartDate) => {
  const previousVersionStartDate = moment(versionStartDate).subtract(1, 'd').endOf('d').toISOString();
  return Contract.findOneAndUpdate(
    { _id: contract._id },
    { $set: { [`versions.${versionIndex - 1}.endDate`]: previousVersionStartDate } }
  );
};

exports.updateVersion = async (contractId, versionId, versionToUpdate) => {
  let unset;
  if (versionToUpdate.signature) {
    const doc = await ESignHelper.generateSignatureRequest(versionToUpdate.signature);
    if (doc.data.error) throw Boom.badRequest(`Eversign: ${doc.data.error.type}`);

    versionToUpdate.signature = { eversignId: doc.data.document_hash };
  } else {
    unset = { 'versions.$[version].signature': '' };
  }

  const payload = { $set: flat({ 'versions.$[version]': { ...versionToUpdate } }) };
  if (unset) payload.$unset = unset;
  const contract = await Contract.findOneAndUpdate(
    { _id: contractId },
    { ...payload },
    {
      // Conversion to objectIds is mandatory as we use directly mongo arrayFilters
      arrayFilters: [{ 'version._id': mongoose.Types.ObjectId(versionId) }],
    }
  ).lean();
  if (!contract) return null;

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

exports.createAndSaveFile = async (version, fileInfo) => {
  if (version.status === CUSTOMER_CONTRACT) {
    const customer = await Customer.findOne({ _id: version.customer }).lean();
    fileInfo.customerDriveId = customer.driveFolder.driveId;
  }
  const payload = await exports.uploadFile(fileInfo, version.status);

  return Contract.findOneAndUpdate(
    { _id: version.contractId },
    { $set: { 'versions.$[version]': payload } },
    {
      new: true,
      arrayFilters: [{ 'version._id': mongoose.Types.ObjectId(version._id) }],
      autopopulate: false,
    }
  );
};

exports.uploadFile = async (fileInfo, status) => {
  if (status === COMPANY_CONTRACT) {
    const uploadedFile = await addFile({ ...fileInfo, driveFolderId: fileInfo.auxiliaryDriveId });
    const driveFileInfo = await Drive.getFileById({ fileId: uploadedFile.id });

    return { auxiliaryDoc: { driveId: uploadedFile.id, link: driveFileInfo.webViewLink } };
  }

  const addFilePromises = [
    addFile({ ...fileInfo, driveFolderId: fileInfo.auxiliaryDriveId }),
    addFile({ ...fileInfo, driveFolderId: fileInfo.customerDriveId }),
  ];
  const [auxiliaryFileUploaded, customerFileUploaded] = await Promise.all(addFilePromises);

  const fileInfoPromises = [
    Drive.getFileById({ fileId: auxiliaryFileUploaded.id }),
    Drive.getFileById({ fileId: customerFileUploaded.id }),
  ];
  const [auxiliaryDriveFile, customerDriveFile] = await Promise.all(fileInfoPromises);

  return {
    auxiliaryDoc: { driveId: auxiliaryFileUploaded.id, link: auxiliaryDriveFile.webViewLink },
    customerDoc: { driveId: customerFileUploaded.id, link: customerDriveFile.webViewLink },
  };
};

exports.saveCompletedContract = async (everSignDoc) => {
  const finalPDF = await ESign.downloadFinalDocument(everSignDoc.data.document_hash);
  const tmpPath = path.join(os.tmpdir(), `signedDoc-${moment().format('DDMMYYYY-HHmm')}.pdf`);
  const file = await createAndReadFile(finalPDF.data, tmpPath);

  let payload = {};
  if (everSignDoc.data.meta.type === CUSTOMER_CONTRACT) {
    payload = await exports.uploadFile({
      auxiliaryDriveId: everSignDoc.data.meta.auxiliaryDriveId,
      customerDriveId: everSignDoc.data.meta.customerDriveId,
      name: everSignDoc.data.title,
      type: 'application/pdf',
      body: file,
    }, CUSTOMER_CONTRACT);
  } else {
    payload = await exports.uploadFile({
      auxiliaryDriveId: everSignDoc.data.meta.auxiliaryDriveId,
      name: everSignDoc.data.title,
      type: 'application/pdf',
      body: file,
    }, COMPANY_CONTRACT);
  }

  await Contract.findOneAndUpdate(
    { 'versions.signature.eversignId': everSignDoc.data.document_hash },
    { $set: flat({ 'versions.$': payload }) },
    { new: true }
  );
};
