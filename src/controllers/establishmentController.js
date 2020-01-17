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
      data: { establishment: establishment.toObject() },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const update = async (req) => {
  try {
    const updatedEstablishment = await Establishment
      .findOneAndUpdate({ _id: req.params._id }, { $set: req.payload }, { new: true })
      .lean();

    return {
      message: translate[language].establishmentUpdated,
      data: { establishment: updatedEstablishment },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { create, update };
