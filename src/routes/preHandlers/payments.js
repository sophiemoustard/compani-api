const Boom = require('boom');
const Payment = require('../../models/Payment');
const Customer = require('../../models/Customer');
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

exports.authorizePaymentsUpdate = (req) => {
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

exports.authorizePaymentsCreation = async (req) => {
  try {
    const { credentials } = req.auth;
    for (const payment of req.payload) {
      const customer = await Customer.findById(payment.customer);
      if (!customer) throw Boom.forbidden();
      if (customer.company.toHexString() !== credentials.company._id.toHexString()) throw Boom.forbidden();
    }
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
    const customer = await Customer.findById(payment.customer);

    if (!customer) throw Boom.forbidden();
    if (customer.company.toHexString() !== credentials.company._id.toHexString()) throw Boom.forbidden();

    return null;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};
