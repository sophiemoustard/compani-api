const Boom = require('boom');
const get = require('lodash/get');

const InternalHour = require('../models/InternalHour');
const InternalHourHelper = require('../helpers/internalHours');
const { MAX_INTERNAL_HOURS_NUMBER } = require('../helpers/constants');
const translate = require('../helpers/translate');

const { language } = translate;

const create = async (req) => {
  try {
    const companyId = get(req, 'auth.credentials.company._id', null);
    const companyInternalHours = await InternalHour.find({ company: companyId }).lean();

    if (companyInternalHours.length >= MAX_INTERNAL_HOURS_NUMBER) {
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
    const internalHourId = req.params._id;
    const updatedInternalHour = await InternalHour.findOneAndUpdate({ _id: internalHourId }, { $set: req.payload }, { new: true });

    if (!updatedInternalHour) return Boom.notFound(translate[language].companyInternalHourNotFound);

    return {
      message: translate[language].companyInternalHourUpdated,
      data: { internalHour: updatedInternalHour },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const list = async (req) => {
  try {
    const query = { ...req.query, company: get(req, 'auth.credentials.company._id', null) };
    const internalHours = await InternalHour.find(query);

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

    await InternalHourHelper.removeInternalHour(internalHour);

    return {
      message: translate[language].companyInternalHourRemoved,
    };
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
