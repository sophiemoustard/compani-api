const Boom = require('@hapi/boom');
const get = require('lodash/get');

const InternalHour = require('../models/InternalHour');
const InternalHourHelper = require('../helpers/internalHours');
const { MAX_INTERNAL_HOURS_NUMBER } = require('../helpers/constants');
const translate = require('../helpers/translate');

const { language } = translate;

const create = async (req) => {
  try {
    const companyId = get(req, 'auth.credentials.company._id', null);
    const companyInternalHoursCount = await InternalHour.countDocuments({ company: companyId });

    if (companyInternalHoursCount >= MAX_INTERNAL_HOURS_NUMBER) {
      return Boom.forbidden(translate[language].companyInternalHourCreationNotAllowed);
    }

    const internalHour = new InternalHour({ ...req.payload, company: companyId });
    await internalHour.save();

    return {
      message: translate[language].companyInternalHourCreated,
      data: { internalHour },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const update = async (req) => {
  try {
    await InternalHour.updateOne({ _id: req.params._id }, { $set: req.payload });

    return { message: translate[language].companyInternalHourUpdated };
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
    const { internalHour } = req.pre;
    if (internalHour.default) return Boom.forbidden(translate[language].companyInternalHourDeletionNotAllowed);

    await InternalHourHelper.removeInternalHour(internalHour, new Date());

    return { message: translate[language].companyInternalHourRemoved };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = {
  create,
  update,
  list,
  remove,
};
