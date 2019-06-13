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
    return Boom.badImplementation(e);
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
    return Boom.badImplementation(e);
  }
};

const updateById = async (req) => {
  try {
    const updatedThirdPartyPayer = await ThirdPartyPayer.findOneAndUpdate({ _id: req.params._id }, { $set: flat(req.payload) }, { new: true });
    if (!updatedThirdPartyPayer) {
      return Boom.notFound(translate[language].thirdPartyPayersNotFound);
    }
    return {
      message: translate[language].thirdPartyPayersUpdated,
      data: { thirdPartyPayer: updatedThirdPartyPayer }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const removeById = async (req) => {
  try {
    const deletedThirdPartyPayer = await ThirdPartyPayer.findByIdAndRemove(req.params._id);
    if (!deletedThirdPartyPayer) {
      return Boom.notFound(translate[language].thirdPartyPayersNotFound);
    }
    return { message: translate[language].deletedThirdPartyPayer };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

module.exports = {
  create,
  list,
  updateById,
  removeById
};
