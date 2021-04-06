const Boom = require('@hapi/boom');
const SurchargeHelper = require('../helpers/surcharges');
const translate = require('../helpers/translate');

const { language } = translate;

const list = async (req) => {
  try {
    const surcharges = await SurchargeHelper.list(req.auth.credentials);

    return { message: translate[language].surchargesFound, data: { surcharges } };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const create = async (req) => {
  try {
    await SurchargeHelper.create(req.payload, req.auth.credentials);

    return { message: translate[language].surchargeCreated };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const update = async (req) => {
  try {
    await SurchargeHelper.update(req.pre.surcharge, req.payload);

    return { message: translate[language].surchargeUpdated };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const remove = async (req) => {
  try {
    await SurchargeHelper.delete(req.pre.surcharge);

    return { message: translate[language].surchargeDeleted };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { list, create, update, remove };
