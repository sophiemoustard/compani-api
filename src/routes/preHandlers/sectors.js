const Boom = require('@hapi/boom');
const Sector = require('../../models/Sector');
const SectorHistory = require('../../models/SectorHistory');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.getSector = async (req) => {
  try {
    const sectorId = req.params._id;
    const sector = await Sector.findById(sectorId).lean();
    if (!sector) throw Boom.notFound(translate[language].sectorNotFound);

    return sector;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizeSectorUpdate = (req) => {
  const { credentials } = req.auth;
  const sector = req.pre.sector || req.payload;
  if (sector.company.toHexString() !== credentials.company._id.toHexString()) throw Boom.forbidden();

  return null;
};

exports.authorizeSectorDeletion = async (req) => {
  const { credentials } = req.auth;
  const { sector } = req.pre;
  if (sector.company.toHexString() !== credentials.company._id.toHexString()) throw Boom.forbidden();

  const historiesCount = await SectorHistory.countDocuments({ sector: sector._id });
  if (historiesCount) throw Boom.forbidden();

  return null;
};
