const Boom = require('boom');

const translate = require('../../helpers/translate');
const services = require('../../models/Ogust/Service');

const { language } = translate;

const list = async (req) => {
  try {
    let servicesRaw = {};
    if ((req.query.isRange && req.query.slotToSub && req.query.slotToAdd && req.query.intervalType)
    || (req.query.isDate && req.query.startDate && req.query.endDate)) {
      const params = req.query;
      params.token = req.headers['x-ogust-token'];
      servicesRaw = await services.getServices(params);
    } else {
      return Boom.badRequest();
    }
    if (servicesRaw.data.status == 'KO') {
      return Boom.badRequest(servicesRaw.body.message);
    } else if (servicesRaw.length === 0) {
      return Boom.notFound();
    }
    return {
      message: translate[language].servicesFound,
      data: { servicesRaw: servicesRaw.data }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const getById = async (req) => {
  try {
    let servicesRaw = {};
    const params = req.query;
    params.token = req.headers['x-ogust-token'];
    params.id_service = req.params.id;
    servicesRaw = await services.getServiceById(params);
    if (servicesRaw.data.status == 'KO') {
      return Boom.badRequest(servicesRaw.data.message);
    } else if (servicesRaw.length === 0) {
      return Boom.notFound();
    }
    return {
      message: translate[language].serviceFound,
      data: { servicesRaw: servicesRaw.data }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const updateById = async (req) => {
  try {
    const params = {};
    params.token = req.headers['x-ogust-token'];
    params.id_service = req.params.id;
    const updatedService = await services.setServiceById(params);
    if (updatedService.data.status == 'KO') {
      return Boom.badRequest(updatedService.data.message);
    }
    return {
      message: translate[language].serviceUpdated,
      data: { updatedService: updatedService.data }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};


module.exports = {
  list,
  getById,
  updateById
};
