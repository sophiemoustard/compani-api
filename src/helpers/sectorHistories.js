const moment = require('moment');
const SectorHistory = require('../models/SectorHistory');
const Contract = require('../models/Contract');
const { COMPANY_CONTRACT } = require('./constants');

exports.updateHistoryOnSectorUpdate = async (auxiliaryId, sector, companyId) => {
  const lastSectorHistory = await SectorHistory.findOne({ auxiliary: auxiliaryId, endDate: { $exists: false } }).lean();
  if (lastSectorHistory.sector.toHexString() === sector) return;

  const contracts = await Contract
    .find({ user: auxiliaryId, status: COMPANY_CONTRACT, company: companyId, endDate: { $exists: false } })
    .sort({ startDate: -1 })
    .lean();
  if (!contracts.length || moment().isBefore(contracts[0].startDate)
    || moment().isSame(lastSectorHistory.startDate, 'day')) return exports.update(auxiliaryId, { $set: { sector } });

  await exports.update(auxiliaryId, { $set: { endDate: moment().subtract(1, 'day').endOf('day').toDate() } });
  return exports.create(auxiliaryId, sector, companyId, moment().startOf('day').toDate());
};

exports.createHistoryOnContractCreation = async (auxiliaryId, sector, newContract, companyId) => {
  const contracts = await Contract.find({ user: auxiliaryId, status: COMPANY_CONTRACT, company: companyId }).lean();
  if (contracts.length > 1) {
    return exports.create(auxiliaryId, sector, companyId, moment(newContract.startDate).startOf('day').toDate());
  }
  return exports.update(auxiliaryId, { $set: { startDate: moment(newContract.startDate).startOf('day').toDate() } });
};

exports.updateHistoryOnContractUpdate = async (contractId, versionToUpdate, companyId) => {
  const contract = await Contract.findOne({ _id: contractId, company: companyId }).lean();
  if (moment(versionToUpdate.startDate).isSameOrBefore(contract.startDate, 'day')) {
    await exports.update(
      contract.user,
      { $set: { startDate: moment(versionToUpdate.startDate).startOf('day').toDate() } }
    );
    return;
  }
  await SectorHistory.remove({
    auxiliary: contract.user,
    endDate: { $gte: contract.startDate, $lte: versionToUpdate.startDate },
  });
  const sectorHistory = await SectorHistory
    .find({ company: companyId, auxiliary: contract.user, startDate: { $gte: moment(contract.startDate).toDate() } })
    .sort({ startDate: 1 })
    .limit(1)
    .lean();

  return SectorHistory.updateOne(
    { _id: sectorHistory[0]._id },
    { $set: { startDate: moment(versionToUpdate.startDate).startOf('day').toDate() } }
  );
};

exports.updateHistoryOnContractDeletion = async (contract, companyId) => {
  const sectorHistory = await SectorHistory.findOne({ auxiliary: contract.user, endDate: { $exists: false } });
  await SectorHistory.remove({
    auxiliary: contract.user,
    company: companyId,
    startDate: { $gte: contract.startDate, $lt: sectorHistory.startDate },
  });

  return exports.update(contract.user, { $unset: { startDate: '' } });
};

exports.create = async (auxiliaryId, sector, companyId, startDate = null) => {
  const payload = { auxiliary: auxiliaryId, sector, company: companyId };
  if (startDate) payload.startDate = startDate;
  return (await SectorHistory.create(payload)).toObject();
};

exports.update = async (auxiliaryId, payload) =>
  SectorHistory.updateOne({ auxiliary: auxiliaryId, endDate: { $exists: false } }, payload);

exports.updateEndDate = async (auxiliaryId, endDate) =>
  SectorHistory.updateOne(
    { auxiliary: auxiliaryId, $or: [{ endDate: { $exists: false } }, { endDate: null }] },
    { $set: { endDate: moment(endDate).endOf('day').toDate() } }
  );
