const Boom = require('@hapi/boom');
const get = require('lodash/get');
const InternalHour = require('../models/InternalHour');
const InternalHourHelper = require('../helpers/internalHours');
const translate = require('../helpers/translate');

const { language } = translate;

const create = async (req) => {
  try {
    await InternalHourHelper.create(req.payload, req.auth.credentials);

    return { message: translate[language].companyInternalHourCreated };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const list = async (req) => {
  try {
    const query = { ...req.query, company: get(req, 'auth.credentials.company._id', null) };
    const internalHours = await InternalHour.find(query).lean();

    return {
      message: translate[language].companyInternalHoursFound,
      data: { internalHours },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const remove = async (req) => {
  try {
    await InternalHourHelper.removeInternalHour(req.pre.internalHour, new Date());

    return { message: translate[language].companyInternalHourRemoved };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = {
  create,
  list,
  remove,
};
