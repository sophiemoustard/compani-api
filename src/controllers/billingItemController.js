const Boom = require('@hapi/boom');
const translate = require('../helpers/translate');
const BillingItemsHelper = require('../helpers/billingItems');

const { language } = translate;

const create = async (req) => {
  try {
    await BillingItemsHelper.create(req.payload, req.auth.credentials);

    return { message: translate[language].billingItemCreated };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const list = async (req) => {
  try {
    const billingItems = await BillingItemsHelper.list(req.auth.credentials, req.query);

    return { data: { billingItems }, message: translate[language].billingItemsFound };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const remove = async (req) => {
  try {
    await BillingItemsHelper.remove(req.params._id, req.params.fundingId);

    return { message: translate[language].billingItemRemoved };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { create, list, remove };
