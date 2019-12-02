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
  const { credentials } = req.auth;
  const { payment } = req.pre;
  if (payment.company.toHexString() === credentials.company._id.toHexString()) return null;

  throw Boom.forbidden();
};

exports.authorizePaymentsCreation = async (req) => {
  const { credentials } = req.auth;
  req.payload.forEach(async (payment) => {
    const customer = await Customer.find({ _id: payment.customer, company: credentials.company._id });
    if (!customer) throw Boom.forbidden();
  });
  return null;
};

exports.authorizePaymentCreation = async (req) => {
  const { credentials } = req.auth;
  const payment = req.payload;

  const customer = await Customer.find({ _id: payment.customer, company: credentials.company._id });
  if (!customer) throw Boom.forbidden();
  return null;
};
