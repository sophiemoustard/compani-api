const Boom = require('boom');
const Payment = require('../../models/Payment');
const Customer = require('../../models/Customer');
const ThirdPartyPayer = require('../../models/ThirdPartyPayer');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.getPayment = async (req) => {
  try {
    const payment = await Payment.findOne({ _id: req.params._id }).lean();
    if (!payment) throw Boom.notFound(translate[language].paymentNotFound);

    return payment;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizePaymentUpdate = (req) => {
  try {
    const { credentials } = req.auth;
    const { payment } = req.pre;
    if (payment.company.toHexString() === credentials.company._id.toHexString()) return null;

    throw Boom.forbidden();
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizePaymentsListCreation = async (req) => {
  try {
    const { credentials } = req.auth;

    const customersIds = [...new Set(req.payload.map(payment => payment.customer))];
    const customersCount = await Customer.countDocuments({ _id: { $in: customersIds }, company: credentials.company._id });
    if (customersCount === customersIds.length) return null;

    throw Boom.forbidden();
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizePaymentCreation = async (req) => {
  try {
    const { credentials } = req.auth;
    const payment = req.payload;

    const customer = await Customer.findById(payment.customer);
    if (!customer) throw Boom.forbidden();
    if (customer.company.toHexString() !== credentials.company._id.toHexString()) throw Boom.forbidden();

    if (payment.client) {
      const tpp = await ThirdPartyPayer.findById(payment.client);
      if (!tpp) throw Boom.forbidden();
      if (tpp.company.toHexString() !== credentials.company._id.toHexString()) throw Boom.forbidden();
    }

    return null;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};
