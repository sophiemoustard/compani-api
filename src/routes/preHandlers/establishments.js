const { get } = require('lodash');
const Boom = require('@hapi/boom');
const Establishment = require('../../models/Establishment');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.authorizeEstablishmentUpdate = async (req) => {
  const { credentials } = req.auth;
  const establishment = await Establishment.findOne({ _id: req.params._id })
    .populate({ path: 'usersCount', match: { company: get(credentials, 'company._id', null) } })
    .lean();

  if (!establishment) throw Boom.notFound(translate[language].establishmentNotFound);

  if (credentials.company._id.toHexString() !== establishment.company.toHexString()) throw Boom.forbidden();

  return establishment;
};

exports.authorizeEstablishmentDeletion = async (req) => {
  const { establishment } = req.pre;
  if (establishment.usersCount > 0) throw Boom.forbidden();

  return null;
};
