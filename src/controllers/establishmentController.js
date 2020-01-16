const Boom = require('boom');
const get = require('lodash/get');
const Establishment = require('../models/Establishment');
const translate = require('../helpers/translate');

const { language } = translate;

const create = async (req) => {
  try {
    const payload = {
      ...req.payload,
      company: get(req, 'auth.credentials.company._id', null),
    };
    const establishment = await Establishment.create(payload);

    return {
      message: translate[language].establishmentCreated,
      data: { establishment },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { create };
