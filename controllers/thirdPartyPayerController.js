const Boom = require('boom');
const flat = require('flat');

const ThirdPartyPayer = require('../models/ThirdPartyPayer');
const translate = require('../helpers/translate');

const { language } = translate;

const create = async (req) => {
  try {
    const thirdPartyPayer = new ThirdPartyPayer(req.payload);
    await thirdPartyPayer.save();

    return {
      message: translate[language].thirdPartyPayerCreated,
      data: { thirdPartyPayer }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const list = async (req) => {
  try {
    const thirdPartyPayers = await ThirdPartyPayer.find(req.query);
    return {
      message: thirdPartyPayers.length === 0 ? translate[language].thirdPartyPayersNotFound : translate[language].thirdPartyPayersFound,
      data: { thirdPartyPayers },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const updateById = async (req) => {
  try {
    const thirdPartyPayerUpdated = await ThirdPartyPayer.findOneAndUpdate({ _id: req.params._id }, { $set: flat(req.payload) }, { new: true });
    if (!thirdPartyPayerUpdated) {
      return Boom.notFound(translate[language].thirdPartyPayersNotFound);
    }
    return {
      message: translate[language].thirdPartyPayersUpdated,
      data: { thirdPartyPayer: thirdPartyPayerUpdated }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const removeById = async (req) => {
  try {
    const thirdPartyPayerDeleted = await ThirdPartyPayer.findByIdAndRemove(req.params._id);
    if (!thirdPartyPayerDeleted) {
      return Boom.notFound(translate[language].thirdPartyPayersNotFound);
    }
    return { message: translate[language].thirdPartyPayerDeleted };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

module.exports = {
  create,
  list,
  updateById,
  removeById
};
