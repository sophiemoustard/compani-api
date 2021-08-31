const Boom = require('@hapi/boom');
const translate = require('../helpers/translate');
const BillingItemHelper = require('../helpers/billingItems');

const { language } = translate;

const create = async (req) => {
  try {
    await BillingItemHelper.create(req.payload, req.auth.credentials);

    return { message: translate[language].billingItemCreated };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const list = async (req) => {
  try {
    const billingItems = await BillingItemHelper.list(req.auth.credentials);

    return { data: billingItems, message: translate[language].billingItemsFound };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { create, list };
