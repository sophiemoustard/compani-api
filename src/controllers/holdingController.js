const Boom = require('@hapi/boom');
const translate = require('../helpers/translate');
const HoldingHelper = require('../helpers/holdings');

const { language } = translate;

const create = async (req) => {
  try {
    await HoldingHelper.create(req.payload);

    return { message: translate[language].holdingCreated };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const list = async (req) => {
  try {
    const holdings = await HoldingHelper.list();

    return {
      message: translate[language].holdingsFound,
      data: { holdings },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const update = async (req) => {
  try {
    await HoldingHelper.update(req.params._id, req.payload);

    return { message: translate[language].companyLinkedToHolding };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { create, list, update };
