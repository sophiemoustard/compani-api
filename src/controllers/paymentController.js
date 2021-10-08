const Boom = require('@hapi/boom');
const flat = require('flat');

const Payment = require('../models/Payment');
const PaymentHelper = require('../helpers/payments');
const translate = require('../helpers/translate');

const { language } = translate;

const create = async (req) => {
  try {
    const { payload, auth } = req;
    const payment = await PaymentHelper.createPayment(payload, auth.credentials);

    return {
      message: translate[language].paymentCreated,
      data: { payment },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const createList = async (req, h) => {
  try {
    const payments = await PaymentHelper.savePayments(req.payload, req.auth.credentials);

    return h.file(payments, { confine: false });
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const update = async (req) => {
  try {
    const payment = await Payment.findOneAndUpdate(
      { _id: req.params._id },
      { $set: flat(req.payload) },
      { new: true }
    ).lean();

    if (!payment) return Boom.notFound(translate[language].paymentNotFound);

    return {
      message: translate[language].paymentUpdated,
      data: { payment },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const remove = async (req) => {
  try {
    await PaymentHelper.remove(req.params._id);

    return { message: translate[language].paymentRemoved };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { create, createList, update, remove };
