const Boom = require('@hapi/boom');
const translate = require('../helpers/translate');
const HoldingHelper = require('../helpers/holdings');

const { language } = translate;
const create = async (req) => {
  try {
    const newHolding = await HoldingHelper.create(req.payload);

    return {
      message: translate[language].holdingCreated,
      data: { holding: newHolding },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { create };
