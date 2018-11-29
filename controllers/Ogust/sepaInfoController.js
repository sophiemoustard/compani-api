const Boom = require('boom');

const translate = require('../../helpers/translate');
const sepaInfo = require('../../models/Ogust/SepaInfo');

const { language } = translate;

const showAll = async (req) => {
  try {
    const params = {
      token: req.headers['x-ogust-token'],
      ...req.query
    };
    const sepaInfoRaw = await sepaInfo.getSepaInfo(params);
    if (sepaInfoRaw.data.status == 'KO') {
      return Boom.badRequest(sepaInfoRaw.data.message);
    }
    return {
      message: translate[language].sepaInfoFound,
      data: { sepaInfo: sepaInfoRaw.data.array_sepainfo.result }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const getById = async (req) => {
  try {
    const params = {
      token: req.headers['x-ogust-token'],
      id_sepainfo: req.params.id,
    };
    const sepaInfoRaw = await sepaInfo.getSepaInfo(params);
    if (sepaInfoRaw.data.status == 'KO') {
      return Boom.badRequest(sepaInfoRaw.data.message);
    }
    return {
      message: translate[language].sepaInfoFound,
      data: { sepaInfo: sepaInfoRaw.data.array_sepainfo.result }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const update = async (req) => {
  try {
    const params = req.payload;
    params.token = req.headers['x-ogust-token'];
    const updatedsepaInfo = await sepaInfo.setSepaInfo(params);
    if (updatedsepaInfo.data.status == 'KO') {
      return Boom.badRequest(updatedsepaInfo.data.message);
    }
    return {
      message: translate[language].sepaInfoUpdated,
      data: { updatedsepaInfo: updatedsepaInfo.data }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const create = async (req) => {
  try {
    const params = req.payload;
    params.token = req.headers['x-ogust-token'];
    const newSepaInfo = await sepaInfo.setSepaInfo(params);
    if (newSepaInfo.data.status == 'KO') {
      return Boom.badRequest(newSepaInfo.data.message);
    }
    return {
      message: translate[language].sepaInfoCreated,
      data: { newsepaInfo: newSepaInfo.data }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

module.exports = {
  showAll,
  update,
  getById,
  create
};
