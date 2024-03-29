const Boom = require('@hapi/boom');
const get = require('lodash/get');
const Payment = require('../../models/Payment');
const Customer = require('../../models/Customer');
const ThirdPartyPayer = require('../../models/ThirdPartyPayer');
const translate = require('../../helpers/translate');
const { REFUND } = require('../../helpers/constants');

const { language } = translate;

exports.getPayment = async (req) => {
  try {
    const { credentials } = req.auth;
    const payment = await Payment.findOne({ _id: req.params._id, company: credentials.company._id }).lean();
    if (!payment) throw Boom.notFound(translate[language].paymentNotFound);

    return payment;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizePaymentsListCreation = async (req) => {
  try {
    const { credentials } = req.auth;

    const customersIds = [...new Set(req.payload.map(payment => payment.customer))];
    const customersCount = await Customer.countDocuments({
      _id: { $in: customersIds },
      company: get(credentials, 'company._id'),
      archivedAt: { $eq: null },
    });

    if (customersCount !== customersIds.length) throw Boom.forbidden();

    return null;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizePaymentCreation = async (req) => {
  try {
    const { credentials } = req.auth;
    const payment = req.payload;
    const companyId = get(credentials, 'company._id');

    const customer = await Customer.countDocuments({
      _id: payment.customer,
      company: companyId,
      archivedAt: { $eq: null },
    });
    if (!customer) throw Boom.forbidden();

    if (payment.thirdPartyPayer) {
      const tpp = await ThirdPartyPayer.countDocuments({ _id: payment.thirdPartyPayer, company: companyId });
      if (!tpp) throw Boom.notFound();
    }

    return null;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizePaymentEdition = async (req) => {
  try {
    const { credentials } = req.auth;
    const { payment } = req.pre;

    const customer = await Customer.countDocuments({
      _id: payment.customer,
      company: get(credentials, 'company._id'),
      archivedAt: { $eq: null },
    });
    if (!customer) throw Boom.forbidden();

    return null;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizePaymentDeletion = async (req) => {
  try {
    const { credentials } = req.auth;
    const { payment } = req.pre;
    if (payment.nature !== REFUND) throw Boom.forbidden();

    const customer = await Customer.countDocuments({
      _id: payment.customer,
      company: get(credentials, 'company._id'),
      archivedAt: { $eq: null },
    });
    if (!customer) throw Boom.forbidden();

    return null;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};
