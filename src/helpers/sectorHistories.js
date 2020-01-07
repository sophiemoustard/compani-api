const moment = require('moment');
const SectorHistory = require('../models/SectorHistory');

exports.createHistory = async (auxiliary, sector, company) => {
  const lastSectorHistory = await SectorHistory.findOne({ auxiliary, company, endDate: { $exists: false } })
    .sort({ startDate: -1 })
    .lean();
  if (!lastSectorHistory) return SectorHistory.create({ auxiliary, sector, company });

  if (lastSectorHistory.sector.toHexString() === sector) return;

  return Promise.all([
    SectorHistory.updateOne(
      { _id: lastSectorHistory._id },
      { $set: { endDate: moment().subtract(1, 'd').endOf('day').toDate() } }
    ),
    SectorHistory.create({ auxiliary, sector, company }),
  ]);
};

exports.updateEndDate = async (auxiliary, endDate) =>
  SectorHistory.updateOne(
    { auxiliary, $or: [{ endDate: { $exists: false } }, { endDate: null }] },
    { $set: { endDate: moment(endDate).endOf('day').toDate() } }
  );
