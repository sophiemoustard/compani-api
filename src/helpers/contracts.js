const flat = require('flat');
const Boom = require('boom');
const mongoose = require('mongoose');
const moment = require('moment');
const path = require('path');
const os = require('os');
const get = require('lodash/get');
const cloneDeep = require('lodash/cloneDeep');
const Contract = require('../models/Contract');
const User = require('../models/User');
const Customer = require('../models/Customer');
const Drive = require('../models/Google/Drive');
const ESign = require('../models/ESign');
const EventHelper = require('./events');
const CustomerHelper = require('./customers');
const GDriveStorageHelper = require('./gdriveStorage');
const { CUSTOMER_CONTRACT, COMPANY_CONTRACT } = require('./constants');
const { createAndReadFile } = require('./file');
const ESignHelper = require('../helpers/eSign');
const EventRepository = require('../repositories/EventRepository');
const ContractRepository = require('../repositories/ContractRepository');

exports.getContractList = async (query) => {
  const rules = [];
  if (query.startDate && query.endDate) {
    rules.push({
      $or: [
        { versions: { $elemMatch: { startDate: { $gte: query.startDate, $lte: query.endDate } } } },
        { endDate: { $gte: query.startDate, $lte: query.endDate } },
      ],
    });
  }
  if (query.customer) rules.push({ customer: query.customer });
  if (query.status) rules.push({ status: query.status });
  if (query.user) rules.push({ user: query.user });

  const params = rules.length > 0 ? { $and: rules } : {};

  return Contract
    .find(params)
    .populate({ path: 'user', select: 'identity administrative.driveFolder sector contact local', populate: { path: 'sector', select: 'name' } })
    .populate({ path: 'customer', select: 'identity driveFolder' })
    .lean();
};

exports.createContract = async (contractPayload) => {
  const newContractPayload = cloneDeep(contractPayload);
  if (newContractPayload.status === COMPANY_CONTRACT) {
    const endedCompanyContracts = await ContractRepository.getUserEndedCompanyContracts(newContractPayload.user, newContractPayload.startDate);
    if (endedCompanyContracts.length && moment(newContractPayload.startDate).isSameOrBefore(moment(endedCompanyContracts[0].endDate), 'd')) {
      throw Boom.badRequest('New company contract start date is before last company contract end date.');
    }
  }

  if (newContractPayload.versions[0].signature) {
    const { signature } = newContractPayload.versions[0];
    const doc = await ESignHelper.generateSignatureRequest(signature);
    if (doc.data.error) throw Boom.badRequest(`Eversign: ${doc.data.error.type}`);
    newContractPayload.versions[0].signature = { eversignId: doc.data.document_hash };
  }
  const newContract = await Contract.create(newContractPayload);

  await User.findOneAndUpdate({ _id: newContract.user }, { $push: { contracts: newContract._id }, $unset: { inactivityDate: '' } });
  if (newContract.customer) await Customer.findOneAndUpdate({ _id: newContract.customer }, { $push: { contracts: newContract._id } });

  return newContract;
};

exports.endContract = async (contractId, contractToEnd, credentials) => {
  const contract = await Contract.findOne({ _id: contractId });
  if (!contract) return null;
  if (contract.endDate) throw Boom.forbidden('Contract is already ended.');

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
  await CustomerHelper.unassignReferentOnContractEnd(contract);
  await EventHelper.removeEventsExceptInterventionsOnContractEnd(contract, credentials);
  await EventHelper.updateAbsencesOnContractEnd(contract.user, contract.endDate, credentials);

  return contract;
};

exports.createVersion = async (contractId, newVersion) => {
  let contract = await Contract.findById(contractId, {}, { autopopulate: false });
  if (!contract) return null;
  if (contract.endDate) throw Boom.forbidden('Contract is already ended.');

  if (newVersion.signature) {
    const doc = await ESignHelper.generateSignatureRequest(newVersion.signature);
    if (doc.data.error) throw Boom.badRequest(`Eversign: ${doc.data.error.type}`);

    newVersion.signature = { eversignId: doc.data.document_hash };
  }

  contract.versions.push(newVersion);
  await contract.save();

  if (contract.versions.length > 1) {
    const previousVersionIndex = contract.versions.length - 2;
    contract = await exports.updatePreviousVersion(contractId, previousVersionIndex, newVersion.startDate);
  }

  return contract;
};

exports.updatePreviousVersion = async (contractId, previousVersionIndex, versionStartDate) => {
  const previousVersionStartDate = moment(versionStartDate).subtract(1, 'd').endOf('d').toISOString();
  return Contract.findOneAndUpdate(
    { _id: contractId },
    { $set: { [`versions.${previousVersionIndex}.endDate`]: previousVersionStartDate } }
  );
};

exports.canUpdate = async (contract, versionToUpdate, versionIndex) => {
  if (versionIndex !== 0) return true;
  if (contract.endDate) return false;

  const { status, user } = contract;
  const { startDate } = versionToUpdate;
  const eventsCount = await EventRepository.countAuxiliaryEventsBetweenDates({ status, auxiliary: user, endDate: startDate });

  return eventsCount === 0;
};

exports.updateVersion = async (contractId, versionId, versionToUpdate) => {
  let contract = await Contract.findOne({ _id: contractId }).lean();
  const index = contract.versions.findIndex(ver => ver._id.toHexString() === versionId);

  const canUpdate = await exports.canUpdate(contract, versionToUpdate, index);
  if (!canUpdate) throw Boom.badData();

  const unset = {};
  const set = { ...versionToUpdate };
  const push = {};
  if (versionToUpdate.signature) {
    const doc = await ESignHelper.generateSignatureRequest(versionToUpdate.signature);
    if (doc.data.error) throw Boom.badRequest(`Eversign: ${doc.data.error.type}`);

    set.signature = { eversignId: doc.data.document_hash };
    unset.signature = { signedBy: '' };
  } else {
    unset.signature = '';
  }

  if (contract.versions[index].customerDoc) {
    push[`versions.${index}.customerArchives`] = contract.versions[index].customerDoc;
    unset.customerDoc = '';
  }

  if (contract.versions[index].auxiliaryDoc) {
    push[`versions.${index}.auxiliaryArchives`] = contract.versions[index].auxiliaryDoc;
    unset.auxiliaryDoc = '';
  }

  const payload = { $set: flat({ [`versions.${index}`]: { ...set } }) };
  if (Object.keys(unset).length > 0) payload.$unset = flat({ [`versions.${index}`]: unset });
  if (Object.keys(push).length > 0) payload.$push = push;

  contract = await Contract.findOneAndUpdate({ _id: contractId }, { ...payload }).lean();
  if (versionToUpdate.startDate) {
    if (index === 0) {
      await Contract.updateOne({ _id: contractId }, { startDate: versionToUpdate.startDate });
    } else {
      const previousVersionIndex = index - 1;
      await exports.updatePreviousVersion(contract, previousVersionIndex, versionToUpdate.startDate);
    }
  }

  return contract;
};

exports.deleteVersion = async (contractId, versionId) => {
  const contract = await Contract.findOne({ _id: contractId, 'versions.0': { $exists: true } });
  if (!contract) return null;

  const isLastVersion = contract.versions[contract.versions.length - 1]._id.toHexString() === versionId;
  if (!isLastVersion) throw Boom.forbidden();
  const deletedVersion = contract.versions[contract.versions.length - 1];

  if (contract.versions.length > 1) {
    contract.versions[contract.versions.length - 2].endDate = undefined;
    contract.versions.pop();
    contract.save();
  } else {
    const { user, startDate, status, customer } = contract;
    const query = { auxiliary: user, startDate, status };
    if (customer) query.customer = customer;
    const eventCount = await EventRepository.countAuxiliaryEventsBetweenDates(query);
    if (eventCount) throw Boom.forbidden();

    await Contract.deleteOne({ _id: contractId });
    await User.updateOne({ _id: contract.user }, { $pull: { contracts: contract._id } });
    if (contract.customer) await Customer.updateOne({ _id: contract.customer }, { $pull: { contracts: contract._id } });
  }

  const auxiliaryDriveId = get(deletedVersion, 'auxiliaryDoc.driveId');
  if (auxiliaryDriveId) GDriveStorageHelper.deleteFile(auxiliaryDriveId);
  const customerDriveId = get(deletedVersion, 'customerDoc.driveId');
  if (customerDriveId) GDriveStorageHelper.deleteFile(customerDriveId);
};

exports.createAndSaveFile = async (version, fileInfo) => {
  if (version.status === CUSTOMER_CONTRACT) {
    const customer = await Customer.findOne({ _id: version.customer }).lean();
    fileInfo.customerDriveId = customer.driveFolder.driveId;
  }
  const payload = await exports.uploadFile(fileInfo, version.status);

  return Contract.findOneAndUpdate(
    { _id: version.contractId },
    { $set: flat({ 'versions.$[version]': payload }) },
    {
      new: true,
      arrayFilters: [{ 'version._id': mongoose.Types.ObjectId(version._id) }],
    }
  );
};

exports.uploadFile = async (fileInfo, status) => {
  if (status === COMPANY_CONTRACT) {
    const uploadedFile = await GDriveStorageHelper.addFile({ ...fileInfo, driveFolderId: fileInfo.auxiliaryDriveId });
    const driveFileInfo = await Drive.getFileById({ fileId: uploadedFile.id });

    return { auxiliaryDoc: { driveId: uploadedFile.id, link: driveFileInfo.webViewLink } };
  }

  const addFilePromises = [
    GDriveStorageHelper.addFile({ ...fileInfo, driveFolderId: fileInfo.auxiliaryDriveId }),
    GDriveStorageHelper.addFile({ ...fileInfo, driveFolderId: fileInfo.customerDriveId }),
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
