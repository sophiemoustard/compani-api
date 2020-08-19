const moment = require('moment');
const SectorHistory = require('../models/SectorHistory');
const Contract = require('../models/Contract');

exports.updateHistoryOnSectorUpdate = async (auxiliaryId, sector, companyId) => {
  const lastSectorHistory = await SectorHistory
    .findOne({ auxiliary: auxiliaryId, $or: [{ endDate: { $exists: false } }, { endDate: null }] })
    .lean();
  if (!lastSectorHistory) {
    return exports.createHistory({ _id: auxiliaryId, sector }, companyId, moment().startOf('day').toDate());
  }

  if (lastSectorHistory.sector.toHexString() === sector) return null;

  const contracts = await Contract
    .find({
      user: auxiliaryId,
      company: companyId,
      $or: [{ endDate: { $exists: false } }, { endDate: null }],
    })
    .sort({ startDate: -1 })
    .lean();
  const doesNotHaveContract = !contracts.length;
  const contractNotStarted = contracts.length && moment().isBefore(contracts[0].startDate);
  const lastHistoryStartsOnSameDay = moment().isSame(lastSectorHistory.startDate, 'day');
  if (doesNotHaveContract || contractNotStarted || lastHistoryStartsOnSameDay) {
    return SectorHistory.updateOne(
      { auxiliary: auxiliaryId, $or: [{ endDate: { $exists: false } }, { endDate: null }] },
      { $set: { sector } }
    );
  }

  await SectorHistory.updateOne(
    { auxiliary: auxiliaryId, $or: [{ endDate: { $exists: false } }, { endDate: null }] },
    { $set: { endDate: moment().subtract(1, 'day').endOf('day').toDate() } }
  );

  return exports.createHistory({ _id: auxiliaryId, sector }, companyId, moment().startOf('day').toDate());
};

exports.createHistoryOnContractCreation = async (user, newContract, companyId) => {
  const startDate = moment(newContract.startDate).startOf('day').toDate();
  const existingHistory = await SectorHistory
    .findOne({ startDate: { $exists: false }, auxiliary: user._id })
    .lean();

  if (existingHistory) {
    return SectorHistory.updateOne({ _id: existingHistory._id }, { $set: { startDate, sector: user.sector } });
  }

  return exports.createHistory(user, companyId, startDate);
};

exports.updateHistoryOnContractUpdate = async (contractId, versionToUpdate, companyId) => {
  const contract = await Contract.findOne({ _id: contractId, company: companyId }).lean();
  if (moment(versionToUpdate.startDate).isSameOrBefore(contract.startDate, 'day')) {
    return SectorHistory.updateOne(
      { auxiliary: contract.user, $or: [{ endDate: { $exists: false } }, { endDate: null }] },
      { $set: { startDate: moment(versionToUpdate.startDate).startOf('day').toDate() } }
    );
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
  const sectorHistory = await SectorHistory
    .findOne({ auxiliary: contract.user, $or: [{ endDate: { $exists: false } }, { endDate: null }] })
    .lean();
  await SectorHistory.remove({
    auxiliary: contract.user,
    company: companyId,
    startDate: { $gte: contract.startDate, $lt: sectorHistory.startDate },
  });

  return SectorHistory.updateOne(
    { auxiliary: contract.user, $or: [{ endDate: { $exists: false } }, { endDate: null }] },
    { $unset: { startDate: '' } }
  );
};

exports.createHistory = async (user, companyId, startDate = null) => {
  const payload = { auxiliary: user._id, sector: user.sector, company: companyId };
  if (startDate) payload.startDate = startDate;

  return (await SectorHistory.create(payload)).toObject();
};

exports.updateEndDate = async (auxiliaryId, endDate) => SectorHistory.updateOne(
  { auxiliary: auxiliaryId, $or: [{ endDate: { $exists: false } }, { endDate: null }] },
  { $set: { endDate: moment(endDate).endOf('day').toDate() } }
);
