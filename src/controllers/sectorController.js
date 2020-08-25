const Boom = require('@hapi/boom');
const translate = require('../helpers/translate');
const SectorHelper = require('../helpers/sectors');

const { language } = translate;

const list = async (req) => {
  try {
    const sectors = await SectorHelper.list(req.auth.credentials);

    return {
      message: translate[language].sectorsFound,
      data: { sectors },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const create = async (req) => {
  try {
    const sector = await SectorHelper.create(req.payload, req.auth.credentials);

    return {
      message: translate[language].sectorCreated,
      data: { sector },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const update = async (req) => {
  try {
    const updatedSector = await SectorHelper.update(req.params._id, req.payload, req.auth.credentials);

    return {
      message: translate[language].sectorUpdated,
      data: { updatedSector },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const remove = async (req) => {
  try {
    await SectorHelper.remove(req.params._id);

    return { message: translate[language].sectorDeleted };
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
