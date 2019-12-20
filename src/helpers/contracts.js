const flat = require('flat');
const Boom = require('boom');
const mongoose = require('mongoose');
const moment = require('../extensions/moment');
const path = require('path');
const os = require('os');
const get = require('lodash/get');
const pick = require('lodash/pick');
const cloneDeep = require('lodash/cloneDeep');
const Contract = require('../models/Contract');
const User = require('../models/User');
const Customer = require('../models/Customer');
const Drive = require('../models/Google/Drive');
const ESign = require('../models/ESign');
const EventHelper = require('./events');
const CustomerHelper = require('./customers');
const UtilsHelper = require('./utils');
const GDriveStorageHelper = require('./gdriveStorage');
const { CUSTOMER_CONTRACT, COMPANY_CONTRACT } = require('./constants');
const { createAndReadFile } = require('./file');
const ESignHelper = require('./eSign');
const UserHelper = require('./users');
const EventRepository = require('../repositories/EventRepository');
const ContractRepository = require('../repositories/ContractRepository');

exports.getContractList = async (query, credentials) => {
  const rules = [{ company: get(credentials, 'company._id', null) }];
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

  return Contract.find(params)
    .populate({
      path: 'user',
      select: 'identity administrative.driveFolder sector contact local',
      populate: { path: 'sector', select: 'name' },
    })
    .populate({ path: 'customer', select: 'identity driveFolder' })
    .lean();
};

exports.hasNotEndedCompanyContracts = async (contract, companyId) => {
  const endedContracts = await ContractRepository.getUserEndedCompanyContracts(contract.user, companyId);

  return endedContracts.length && moment(contract.startDate).isSameOrBefore(endedContracts[0].endDate, 'd');
};

exports.createContract = async (contractPayload, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const payload = { ...cloneDeep(contractPayload), company: companyId };

  if (payload.status === COMPANY_CONTRACT) {
    const hasNotEndedCompanyContracts = await exports.hasNotEndedCompanyContracts(payload, companyId);
    if (hasNotEndedCompanyContracts) throw Boom.badRequest('New contract start date is before last company contract end date.');
  }

  if (payload.versions[0].signature) {
    const { signature } = payload.versions[0];
    const doc = await ESignHelper.generateSignatureRequest(signature);
    if (doc.data.error) throw Boom.badRequest(`Eversign: ${doc.data.error.type}`);

    payload.versions[0].signature = { eversignId: doc.data.document_hash };
  }

  const newContract = await Contract.create(payload);

  await User.findOneAndUpdate(
    { _id: newContract.user },
    { $push: { contracts: newContract._id }, $unset: { inactivityDate: '' } }
  );
  if (newContract.customer) {
    await Customer.findOneAndUpdate({ _id: newContract.customer }, { $push: { contracts: newContract._id } });
  }

  return newContract;
};

exports.endContract = async (contractId, contractToEnd, credentials) => {
  const contract = await Contract.findOne({ _id: contractId }).lean();
  const lastVersion = contract.versions[contract.versions.length - 1];
  if (moment(contractToEnd.endDate).isBefore(lastVersion.startDate, 'd')) throw Boom.conflict('End date is before last version start date');

  const set = {
    endDate: contractToEnd.endDate,
    endNotificationDate: contractToEnd.endNotificationDate,
    endReason: contractToEnd.endReason,
    otherMisc: contractToEnd.otherMisc,
    [`versions.${contract.versions.length - 1}.endDate`]: contractToEnd.endDate,
  };
  const updatedContract = await Contract.findOneAndUpdate({ _id: contractId }, { $set: flat(set) }, { new: true }).lean();

  await Promise.all([
    UserHelper.updateUserInactivityDate(updatedContract.user, updatedContract.endDate, credentials),
    EventHelper.unassignInterventionsOnContractEnd(updatedContract, credentials),
    CustomerHelper.unassignReferentOnContractEnd(updatedContract),
    EventHelper.removeEventsExceptInterventionsOnContractEnd(updatedContract, credentials),
    EventHelper.updateAbsencesOnContractEnd(updatedContract.user, updatedContract.endDate, credentials),
  ]);

  return updatedContract;
};

exports.createVersion = async (contractId, versionPayload) => {
  const contract = await Contract.findOne({ _id: contractId }).lean();
  if (contract.endDate) throw Boom.forbidden('Contract is already ended.');

  const versionToAdd = { ...versionPayload };
  if (versionPayload.signature) {
    const doc = await ESignHelper.generateSignatureRequest(versionPayload.signature);
    if (doc.data.error) throw Boom.badRequest(`Eversign: ${doc.data.error.type}`);

    versionToAdd.signature = { eversignId: doc.data.document_hash };
  }

  if (contract.versions && contract.versions.length >= 1) {
    const previousVersionIndex = contract.versions.length - 1;
    const previousVersionEndDate = moment(versionToAdd.startDate).subtract(1, 'd').endOf('d').toISOString();

    await Contract.updateOne(
      { _id: contractId },
      { $set: { [`versions.${previousVersionIndex}.endDate`]: previousVersionEndDate } }
    );
  }

  return Contract.findOneAndUpdate({ _id: contractId }, { $push: { versions: versionToAdd } }).lean();
};

exports.canUpdateVersion = async (contract, versionToUpdate, versionIndex, credentials) => {
  if (versionIndex !== 0) return true;
  if (contract.endDate) return false;

  const { status, user } = contract;
  const { startDate } = versionToUpdate;
  const eventsCount = await EventRepository.countAuxiliaryEventsBetweenDates({
    status,
    auxiliary: user,
    endDate: startDate,
    company: get(credentials, 'company._id', null),
  });

  return eventsCount === 0;
};

exports.formatVersionEditionPayload = async (oldVersion, newVersion, versionIndex) => {
  const versionUnset = { signature: '' };
  const versionSet = { ...newVersion };
  if (newVersion.signature) {
    const doc = await ESignHelper.generateSignatureRequest(newVersion.signature);
    if (doc.data.error) throw Boom.badRequest(`Eversign: ${doc.data.error.type}`);

    versionSet.signature = { eversignId: doc.data.document_hash };
    versionUnset.signature = { signedBy: '' };
  }

  const push = {};
  if (oldVersion.customerDoc) {
    push[`versions.${versionIndex}.customerArchives`] = oldVersion.customerDoc;
    versionUnset.customerDoc = '';
  }
  if (oldVersion.auxiliaryDoc) {
    push[`versions.${versionIndex}.auxiliaryArchives`] = oldVersion.auxiliaryDoc;
    versionUnset.auxiliaryDoc = '';
  }

  const set = { [`versions.${versionIndex}`]: versionSet };
  if (newVersion.startDate) {
    if (versionIndex === 0) set.startDate = newVersion.startDate;
    else {
      set[`versions.${versionIndex - 1}`] = { endDate: moment(newVersion.startDate).subtract(1, 'd').endOf('d').toISOString() };
    }
  }

  const payload = { $set: flat({ ...set }) };
  if (Object.keys(versionUnset).length > 0) payload.$unset = flat({ [`versions.${versionIndex}`]: versionUnset });
  if (Object.keys(push).length > 0) payload.$push = push;

  return payload;
};

exports.updateVersion = async (contractId, versionId, versionToUpdate, credentials) => {
  const contract = await Contract.findOne({ _id: contractId }).lean();
  const index = contract.versions.findIndex(ver => ver._id.toHexString() === versionId);

  const canUpdate = await exports.canUpdateVersion(contract, versionToUpdate, index, credentials);
  if (!canUpdate) throw Boom.badData();

  const payload = await exports.formatVersionEditionPayload(contract.versions[index], versionToUpdate, index);

  if (payload.$unset && Object.keys(payload.$unset).length > 0) {
    await Contract.updateOne({ _id: contractId }, { $unset: payload.$unset });
  }

  return Contract.findOneAndUpdate({ _id: contractId }, { ...pick(payload, ['$set', '$push']) }).lean();
};

exports.deleteVersion = async (contractId, versionId, credentials) => {
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
    const query = { auxiliary: user, startDate, status, company: get(credentials, 'company._id', null) };
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
  const payload = await exports.addFile(fileInfo, version.status);

  return Contract.findOneAndUpdate(
    { _id: version.contractId },
    { $set: flat({ 'versions.$[version]': payload }) },
    {
      new: true,
      arrayFilters: [{ 'version._id': mongoose.Types.ObjectId(version._id) }],
    }
  );
};

exports.addFile = async (fileInfo, status) => {
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
    payload = await exports.addFile({
      auxiliaryDriveId: everSignDoc.data.meta.auxiliaryDriveId,
      customerDriveId: everSignDoc.data.meta.customerDriveId,
      name: everSignDoc.data.title,
      type: 'application/pdf',
      body: file,
    }, CUSTOMER_CONTRACT);
  } else {
    payload = await exports.addFile({
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

exports.getContractInfo = (versions, query, monthRatio) => {
  let contractHours = 0;
  let workedDays = 0;
  let holidaysHours = 0;
  const monthDays = monthRatio.businessDays + monthRatio.holidays;
  for (const version of versions) {
    const startDate = moment(version.startDate).isBefore(query.startDate)
      ? moment(query.startDate).toDate()
      : moment(version.startDate).startOf('d').toDate();
    const endDate = version.endDate && moment(version.endDate).isBefore(query.endDate)
      ? moment(version.endDate).endOf('d').toDate()
      : moment(query.endDate).toDate();
    const ratio = UtilsHelper.getDaysRatioBetweenTwoDates(startDate, endDate);

    const versionDays = ratio.businessDays + ratio.holidays;
    workedDays += versionDays;
    contractHours += version.weeklyHours * (versionDays / monthDays);
    holidaysHours += (version.weeklyHours / 6) * ratio.holidays;
  }

  return { contractHours, holidaysHours, workedDaysRatio: workedDays / monthDays };
};

exports.getMatchingVersionsList = (versions, query) => versions.filter((ver) => {
  const isStartedOnEndDate = moment(ver.startDate).isSameOrBefore(query.endDate);
  const isEndedOnStartDate = ver.endDate && moment(ver.endDate).isSameOrBefore(query.startDate);

  return isStartedOnEndDate && !isEndedOnStartDate;
});

exports.uploadFile = async (params, payload) => {
  const fileInfo = {
    auxiliaryDriveId: params.driveId,
    name: payload.fileName,
    type: payload['Content-Type'],
    body: payload.file,
  };
  const version = {
    customer: payload.customer,
    contractId: params._id,
    _id: payload.versionId,
    status: payload.status,
  };
  return exports.createAndSaveFile(version, fileInfo);
};
