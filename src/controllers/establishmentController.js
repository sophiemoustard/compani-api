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

const list = async (req) => {
  try {
    const companyId = get(req, 'auth.credentials.company._id', null);
    const establishments = await Establishment
      .find({ company: companyId })
      .populate({ path: 'users', match: { company: companyId } })
      .lean({ virtuals: true });

    return {
      message: translate[language].establishmentsFound,
      data: { establishments },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const remove = async (req) => {
  try {
    const establishment = await Establishment
      .findById(req.params._id)
      .populate({ path: 'users', match: { company: get(req, 'auth.credentials.company._id', null) } });

    if (establishment.users > 0) throw Boom.forbidden();

    await establishment.remove();

    return { message: translate[language].establishmentRemoved };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
}

module.exports = { create, update, list, remove };
