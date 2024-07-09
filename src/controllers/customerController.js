const Boom = require('@hapi/boom');
const get = require('lodash/get');
const translate = require('../helpers/translate');
const SubscriptionHelper = require('../helpers/subscriptions');
const CustomerHelper = require('../helpers/customers');
const FundingHelper = require('../helpers/fundings');
const MandatesHelper = require('../helpers/mandates');
const QuoteHelper = require('../helpers/quotes');

const { language } = translate;

const list = async (req) => {
  try {
    const customers = await CustomerHelper.getCustomers(req.auth.credentials, req.query);

    return {
      message: customers.length === 0 ? translate[language].customersNotFound : translate[language].customersFound,
      data: { customers },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const listWithFirstIntervention = async (req) => {
  try {
    req.log('customerController - listWithFirstIntervention - query', req.query);
    req.log('customerController - listWithFirstIntervention - company', get(req, 'auth.credentials.company._id'));

    const customers = await CustomerHelper.getCustomersFirstIntervention(req.query, req.auth.credentials);

    return {
      message: customers.length === 0 ? translate[language].customersNotFound : translate[language].customersFound,
      data: { customers },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const listWithSubscriptions = async (req) => {
  try {
    req.log('customerController - listWithSubscriptions', get(req, 'auth.credentials.company._id'));

    const customers = await CustomerHelper.getCustomersWithSubscriptions(req.auth.credentials);

    return {
      message: customers.length === 0 ? translate[language].customersNotFound : translate[language].customersFound,
      data: { customers },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const listBySector = async (req) => {
  try {
    const customers = await CustomerHelper.getCustomersBySector(req.query, req.auth.credentials);

    return {
      message: customers.length === 0 ? translate[language].customersNotFound : translate[language].customersFound,
      data: { customers },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const listWithBilledEvents = async (req) => {
  try {
    const customers = await CustomerHelper.getCustomersWithBilledEvents(req.auth.credentials);

    return {
      message: customers.length === 0 ? translate[language].customersNotFound : translate[language].customersFound,
      data: { customers },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const listWithIntervention = async (req) => {
  try {
    const customers = await CustomerHelper.getCustomersWithIntervention(req.auth.credentials);

    return {
      message: customers.length > 0 ? translate[language].customersFound : translate[language].customersNotFound,
      data: { customers },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const show = async (req) => {
  try {
    const customer = await CustomerHelper.getCustomer(req.params._id, req.auth.credentials);
    if (!customer) return Boom.notFound(translate[language].customerNotFound);

    return {
      message: translate[language].customerFound,
      data: { customer },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const create = async (req) => {
  try {
    const customer = await CustomerHelper.createCustomer(req.payload, req.auth.credentials);

    return {
      message: translate[language].customerCreated,
      data: { customer },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const updateSubscription = async (req) => {
  try {
    const customer = await SubscriptionHelper.updateSubscription(req.params, req.payload);

    return {
      message: translate[language].customerSubscriptionUpdated,
      data: { customer },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const addSubscription = async (req) => {
  try {
    const customer = await SubscriptionHelper.addSubscription(req.params._id, req.payload);

    return {
      message: translate[language].customerSubscriptionAdded,
      data: { customer },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const deleteSubscription = async (req) => {
  try {
    await SubscriptionHelper.deleteSubscription(req.params._id, req.params.subscriptionId);

    return { message: translate[language].customerSubscriptionRemoved };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const getMandates = async (req) => {
  try {
    const customer = await MandatesHelper.getMandates(req.params._id);

    if (!customer) return Boom.notFound(translate[language].customerNotFound);

    return {
      message: translate[language].customerMandatesFound,
      data: { customer },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const updateMandate = async (req) => {
  try {
    const customer = await MandatesHelper.updateMandate(req.params._id, req.params.mandateId, req.payload);

    return {
      message: translate[language].customerMandateUpdated,
      data: { customer },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const getCustomerQuotes = async (req) => {
  try {
    const customer = await QuoteHelper.getQuotes(req.params._id);
    if (!customer) return Boom.notFound();

    return {
      message: translate[language].customerQuotesFound,
      data: { customer },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const createCustomerQuote = async (req) => {
  try {
    const customer = await QuoteHelper.createQuote(req.params._id, req.payload, req.auth.credentials);

    return {
      message: translate[language].customerQuoteAdded,
      data: { customer },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const uploadFile = async (req) => {
  try {
    const uploadedFile = await CustomerHelper.createAndSaveFile(req.params, req.payload);

    return {
      message: translate[language].fileCreated,
      data: { uploadedFile },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const deleteCertificates = async (req) => {
  try {
    await CustomerHelper.deleteCertificates(req.params._id, req.payload.driveId);

    return { message: translate[language].customerFinancialCertificateRemoved };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const createFunding = async (req) => {
  try {
    const customer = await FundingHelper.createFunding(req.params._id, req.payload);

    return {
      message: translate[language].customerFundingCreated,
      data: { customer },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const updateFunding = async (req) => {
  try {
    const customer = await FundingHelper.updateFunding(req.params._id, req.params.fundingId, req.payload);

    return {
      message: translate[language].customerFundingUpdated,
      data: { customer },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const deleteFunding = async (req) => {
  try {
    await FundingHelper.deleteFunding(req.params._id, req.params.fundingId);

    return { message: translate[language].customerFundingRemoved };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const getQRCode = async (req, h) => {
  try {
    req.log('customerController - getQRCode - params', req.params);
    req.log('customerController - getQRCode - company', get(req, 'auth.credentials.company._id'));

    const { pdf, fileName } = await CustomerHelper.generateQRCode(req.params._id);

    return h.response(pdf)
      .header('content-disposition', `inline; filename=${fileName}.pdf`)
      .type('application/pdf');
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = {
  list,
  listWithFirstIntervention,
  listWithSubscriptions,
  listBySector,
  listWithBilledEvents,
  listWithIntervention,
  show,
  create,
  addSubscription,
  updateSubscription,
  deleteSubscription,
  getMandates,
  updateMandate,
  getCustomerQuotes,
  createCustomerQuote,
  uploadFile,
  deleteCertificates,
  createFunding,
  updateFunding,
  deleteFunding,
  getQRCode,
};
