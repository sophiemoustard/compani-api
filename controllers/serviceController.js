const Boom = require('boom');

const Service = require('../models/Service');
const translate = require('../helpers/translate');

const { language } = translate;

const list = async (req) => {
  try {
    const services = await Service.find(req.query);

    return {
      message: services.length === 0 ? translate[language].servicesNotFound : translate[language].servicesFound,
      data: { services },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const create = async (req) => {
  try {
    const service = new Service(req.payload);
    await service.save();

    return {
      message: translate[language].serviceCreated,
      data: { service },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const update = async (req) => {
  try {
    const updatedService = await Service.findByIdAndUpdate(req.params._id, { $push: { versions: req.payload } }, { new: true });

    if (!updatedService) return Boom.notFound(translate[language].serviceNotFound);

    return {
      message: translate[language].serviceUpdated,
      data: { updatedService },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
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
    return Boom.badImplementation();
  }
};

module.exports = {
  list,
  create,
  update,
  remove
};
