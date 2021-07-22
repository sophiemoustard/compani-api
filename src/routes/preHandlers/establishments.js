const Boom = require('@hapi/boom');
const Establishment = require('../../models/Establishment');
const translate = require('../../helpers/translate');
const UtilsHelper = require('../../helpers/utils');

const { language } = translate;

exports.authorizeEstablishmentUpdate = async (req) => {
  const { credentials } = req.auth;
  const establishment = await Establishment.findOne({ _id: req.params._id }).populate({ path: 'usersCount' }).lean();
  if (!establishment) throw Boom.notFound(translate[language].establishmentNotFound);

  if (!UtilsHelper.areObjectIdsEquals(credentials.company._id, establishment.company)) throw Boom.forbidden();

  return establishment;
};

exports.authorizeEstablishmentDeletion = async (req) => {
  const { establishment } = req.pre;
  if (establishment.usersCount > 0) throw Boom.forbidden();

  return null;
};
