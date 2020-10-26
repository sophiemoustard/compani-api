const Boom = require('@hapi/boom');
const ServiceHelper = require('../helpers/services');
const translate = require('../helpers/translate');

const { language } = translate;

const list = async (req) => {
  try {
    const services = await ServiceHelper.list(req.auth.credentials, req.query);

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
    const service = await ServiceHelper.create(req.auth.credentials.company._id, req.payload);

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
    await ServiceHelper.remove(req.params._id);

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
