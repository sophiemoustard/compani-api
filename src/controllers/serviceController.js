const Boom = require('boom');

const Service = require('../models/Service');
const translate = require('../helpers/translate');

const { language } = translate;

const list = async (req) => {
  try {
    if (!(req.auth.credentials.company && req.auth.credentials.company._id)) throw Boom.forbidden();
    const query = { company: req.auth.credentials.company._id };
    const services = await Service.find(query).populate('versions.surcharge').lean();
    return {
      message: services.length === 0 ? translate[language].servicesNotFound : translate[language].servicesFound,
      data: { services },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const create = async (req) => {
  try {
    if (!(req.auth.credentials.company && req.auth.credentials.company._id)) throw Boom.forbidden();
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
    return Boom.badImplementation(e);
  }
};

const update = async (req) => {
  try {
    const updatedService = await Service.findByIdAndUpdate(req.params._id, { $push: { versions: req.payload } }, { new: true });

    if (!updatedService) return Boom.notFound(translate[language].serviceNotFound);

    return {
      message: translate[language].serviceUpdated,
      data: { service: updatedService },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
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
    return Boom.badImplementation(e);
  }
};

module.exports = {
  list,
  create,
  update,
  remove,
};
