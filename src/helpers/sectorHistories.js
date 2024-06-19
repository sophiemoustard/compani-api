const SectorHistory = require('../models/SectorHistory');

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
