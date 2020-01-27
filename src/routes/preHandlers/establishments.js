const Boom = require('boom');
const Establishment = require('../../models/Establishment');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.getEstablishment = async (req) => {
  try {
    const establishment = await Establishment.findOne({ _id: req.params._id }).lean();
    if (!establishment) throw Boom.notFound(translate[language].establishmentNotFound);

    return establishment;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizeEstablishmentUpdate = async (req) => {
  const { credentials } = req.auth;
  const { establishment } = req.pre;

  if (credentials.company._id.toHexString() !== establishment.company.toHexString()) throw Boom.forbidden();

  return null;
};
