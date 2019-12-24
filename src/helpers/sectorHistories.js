const Boom = require('boom');
const moment = require('moment');
const SectorHistory = require('../models/SectorHistory');
const translate = require('../helpers/translate');

const { language } = translate;

exports.createHistory = async (auxiliary, sector, company) => {
  const lastSectorHistory = await SectorHistory.findOne({ auxiliary, company }).sort({ _id: -1 }).lean();
  if (!lastSectorHistory) throw Boom.notFound(translate[language].sectorHistoryNotFound);
  if (lastSectorHistory.sector.toHexString() === sector) return;

  return Promise.all([
    SectorHistory.updateOne({ _id: lastSectorHistory._id }, { $set: { endDate: moment().subtract(1, 'd').toDate() } }),
    SectorHistory.create({ auxiliary, sector, company }),
  ]);
};
