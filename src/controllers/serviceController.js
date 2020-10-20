const Boom = require('@hapi/boom');
const get = require('lodash/get');

const Service = require('../models/Service');
const ServiceHelper = require('../helpers/services');
const translate = require('../helpers/translate');

const { language } = translate;

const list = async (req) => {
  try {
    const companyId = get(req, 'auth.credentials.company._id', null);
    const query = { company: companyId };
    const services = await Service.find(query)
      .populate({ path: 'versions.surcharge', match: { company: companyId } })
      .lean();
    return {
      message: services.length === 0 ? translate[language].servicesNotFound : translate[language].servicesFound,
      data: { services },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const create = async (req) => {
  try {
    const payload = {
      ...req.payload,
      company: req.auth.credentials.company._id,
    };
    const service = new Service(payload);
    await service.save();

    return {
      message: translate[language].serviceCreated,
      data: { service },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const update = async (req) => {
  try {
    await ServiceHelper.update(req.params._id, req.payload);

    return { message: translate[language].serviceUpdated };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const remove = async (req) => {
  try {
    const service = await Service.findByIdAndRemove(req.params._id);
    if (!service) return Boom.notFound(translate[language].serviceNotFound);

    return {
      message: translate[language].serviceDeleted,
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = {
  list,
  create,
  update,
  remove,
};
