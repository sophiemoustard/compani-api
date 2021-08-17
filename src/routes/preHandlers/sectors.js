const get = require('lodash/get');
const Boom = require('@hapi/boom');
const Sector = require('../../models/Sector');
const SectorHistory = require('../../models/SectorHistory');
const translate = require('../../helpers/translate');
const { areObjectIdsEquals } = require('../../helpers/utils');

const { language } = translate;

exports.getSector = async (req) => {
  try {
    const { credentials } = req.auth;
    const sectorId = req.params._id;
    const sector = await Sector.findOne({ _id: sectorId, company: get(credentials, 'company._id') }).lean();
    if (!sector) throw Boom.notFound(translate[language].sectorNotFound);

    return sector;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizeSectorCreation = async (req) => {
  const { credentials } = req.auth;
  const existingSector = await Sector.countDocuments({
    name: req.payload.name,
    company: get(credentials, 'company._id'),
  });
  if (existingSector) throw Boom.conflict(translate[language].sectorAlreadyExists);

  return null;
};

exports.authorizeSectorUpdate = async (req) => {
  const { credentials } = req.auth;
  const sector = req.pre.sector || req.payload;
  if (!areObjectIdsEquals(sector.company, credentials.company._id)) throw Boom.notFound();

  const existingSector = await Sector.countDocuments({ name: req.payload.name, company: sector.company });
  if (existingSector) throw Boom.conflict(translate[language].sectorAlreadyExists);

  return null;
};

exports.authorizeSectorDeletion = async (req) => {
  const { sector } = req.pre;

  const historiesCount = await SectorHistory.countDocuments({ sector: sector._id });
  if (historiesCount) throw Boom.forbidden();

  return null;
};
