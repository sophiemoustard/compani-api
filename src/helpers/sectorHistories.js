const moment = require('moment');
const Boom = require('@hapi/boom');
const SectorHistory = require('../models/SectorHistory');
const Contract = require('../models/Contract');
const DatesHelper = require('./dates');
const UtilsHelper = require('./utils');

exports.updateHistoryOnSectorUpdate = async (auxiliaryId, sector, companyId) => {
  const yesterday = moment().subtract(1, 'day').endOf('day').toDate();
  const lastSectorHistory = await SectorHistory
    .findOne({ auxiliary: auxiliaryId, $or: [{ endDate: { $gt: yesterday } }, { endDate: null }] })
    .lean();
  const contracts = await Contract
    .find({ user: auxiliaryId, company: companyId, $or: [{ endDate: { $gt: yesterday } }, { endDate: null }] })
    .sort({ startDate: -1 })
    .lean();

  const notInContract = contracts.every(contract =>
    DatesHelper.isAfter(contract.startDate, new Date()) || DatesHelper.isBefore(contract.endDate, new Date()));
  if (!lastSectorHistory && notInContract) return exports.createHistory({ _id: auxiliaryId, sector }, companyId);
  if (!lastSectorHistory) throw Boom.conflict('No last sector history for auxiliary in contract');

  if (UtilsHelper.areObjectIdsEquals(lastSectorHistory.sector, sector)) return null;

  const contractNotStarted = contracts.length && DatesHelper.isAfter(contracts[0].startDate, new Date());
  const lastHistoryStartsOnSameDay = moment().isSame(lastSectorHistory.startDate, 'day');
  if (!contracts.length || contractNotStarted || lastHistoryStartsOnSameDay) {
    return SectorHistory.updateOne({ _id: lastSectorHistory._id }, { $set: { sector } });
  }

  await SectorHistory.updateOne({ _id: lastSectorHistory._id }, { $set: { endDate: yesterday } });

  return exports.createHistory(
    { _id: auxiliaryId, sector },
    companyId,
    moment().startOf('day').toDate(),
    lastSectorHistory.endDate
  );
};

exports.createHistoryOnContractCreation = async (user, newContract, companyId) => {
  const startDate = moment(newContract.startDate).startOf('day').toDate();
  const startedHistory = await SectorHistory
    .countDocuments({ startDate: { $exists: true }, endDate: { $exists: false }, auxiliary: user._id })
    .lean();

  if (startedHistory) throw Boom.conflict('There is a sector history with a startDate without an endDate');

  const existingHistory = await SectorHistory
    .findOne({ startDate: { $exists: false }, auxiliary: user._id })
    .lean();

  if (existingHistory) {
    return SectorHistory.updateOne({ _id: existingHistory._id }, { $set: { startDate, sector: user.sector } });
  }

  return exports.createHistory(user, companyId, startDate);
};

exports.createHistory = async (user, companyId, startDate = null, endDate = null) => {
  const payload = { auxiliary: user._id, sector: user.sector, company: companyId };
  if (startDate) payload.startDate = startDate;
  if (endDate) payload.endDate = endDate;

  return (await SectorHistory.create(payload)).toObject();
};

exports.getAuxiliarySectors = async (auxiliaryId, companyId, startDate, endDate) => {
  const sectors = await SectorHistory.find(
    {
      company: companyId,
      auxiliary: auxiliaryId,
      startDate: { $lt: endDate },
      $or: [{ endDate: { $gt: startDate } }, { endDate: { $exists: false } }],
    },
    { sector: 1 }
  ).lean();

  return [...new Set(sectors.map(sh => sh.sector.toHexString()))];
};
