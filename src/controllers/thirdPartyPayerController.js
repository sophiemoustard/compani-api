const Boom = require('@hapi/boom');
const ThirdPartyPayersHelper = require('../helpers/thirdPartyPayers');
const translate = require('../helpers/translate');

const { language } = translate;

const create = async (req) => {
  try {
    const thirdPartyPayer = await ThirdPartyPayersHelper.create(req.payload, req.auth.credentials);

    return {
      message: translate[language].thirdPartyPayerCreated,
      data: { thirdPartyPayer },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const list = async (req) => {
  try {
    const thirdPartyPayers = await ThirdPartyPayersHelper.list(req.auth.credentials);

    return {
      message: thirdPartyPayers.length === 0
        ? translate[language].thirdPartyPayersNotFound
        : translate[language].thirdPartyPayersFound,
      data: { thirdPartyPayers },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const updateById = async (req) => {
  try {
    const thirdPartyPayer = await ThirdPartyPayersHelper.update(req.params._id, req.payload);

    return {
      message: translate[language].thirdPartyPayersUpdated,
      data: { thirdPartyPayer },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const removeById = async (req) => {
  try {
    await ThirdPartyPayersHelper.delete(req.params._id);

    return { message: translate[language].thirdPartyPayerDeleted };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { create, list, updateById, removeById };
