const moment = require('moment');
const SectorHistory = require('../models/SectorHistory');


exports.createHistory = async (auxiliary, sector, company) => {
  const lastSectorHistory = await SectorHistory.findOne({ auxiliary, company }).sort({ _id: -1 }).lean();
  if (!lastSectorHistory) return SectorHistory.create({ auxiliary, sector, company });
  if (lastSectorHistory.sector.toHexString() === sector) return;

  return Promise.all([
    SectorHistory.updateOne({ _id: lastSectorHistory._id }, { $set: { endDate: moment().subtract(1, 'd').toDate() } }),
    SectorHistory.create({ auxiliary, sector, company }),
  ]);
};
