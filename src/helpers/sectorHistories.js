const moment = require('moment');
const { ObjectID } = require('mongodb');
const get = require('lodash/get');
const SectorHistory = require('../models/SectorHistory');
const SectorHistoryRepository = require('../repositories/SectorHistoryRepository');

exports.createHistory = async (auxiliary, sector, company) => {
  const lastHistory = await SectorHistory.findOne({ auxiliary, company, endDate: { $exists: false } })
    .sort({ startDate: -1 })
    .lean();
  if (!lastHistory) return SectorHistory.create({ auxiliary, sector, company });

  if (lastHistory.sector.toHexString() === sector) return;

  const endDate = moment().subtract(1, 'd').endOf('day').toDate();
  if (moment(endDate).isSameOrBefore(lastHistory.startDate)) {
    await SectorHistory.deleteOne({ _id: lastHistory._id });
  } else {
    await SectorHistory.updateOne({ _id: lastHistory._id }, { $set: { endDate } });
  }

  return SectorHistory.create({ auxiliary, sector, company });
};

exports.updateEndDate = async (auxiliary, endDate) =>
  SectorHistory.updateOne(
    { auxiliary, $or: [{ endDate: { $exists: false } }, { endDate: null }] },
    { $set: { endDate: moment(endDate).endOf('day').toDate() } }
  );

exports.getUsersBySectors = async (month, sectors, companyId) =>
  SectorHistoryRepository.getUsersBySectors(month, sectors, companyId);
