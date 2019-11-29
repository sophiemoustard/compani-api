const Boom = require('boom');
const flat = require('flat');

const Payment = require('../models/Payment');
const PaymentHelper = require('../helpers/payments');
const translate = require('../helpers/translate');

const { language } = translate;

const list = async (req) => {
  try {
    const payments = await PaymentHelper.list(req.query, req.auth.credentials);

    return {
      message: payments.length === 0 ? translate[language].paymentsNotFound : translate[language].paymentsFound,
      data: { payments },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

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
    const [payments] = await PaymentHelper.savePayments(req.payload, req.auth.credentials);
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
    );

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

module.exports = {
  list,
  create,
  createList,
  update,
};
