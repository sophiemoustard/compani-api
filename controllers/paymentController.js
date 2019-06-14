const Boom = require('boom');
const flat = require('flat');

const Payment = require('../models/Payment');
const { getDateQuery } = require('../helpers/utils');
const { savePayments, formatPayment } = require('../helpers/payments');
const translate = require('../helpers/translate');

const { language } = translate;

const list = async (req) => {
  try {
    const { startDate, endDate, ...rest } = req.query;
    const query = rest;
    if (startDate || endDate) query.date = getDateQuery({ startDate, endDate });

    const payments = await Payment.find(query)
      .populate({ path: 'client', select: '_id name' })
      .populate({ path: 'customer', select: '_id identity' });

    return {
      message: payments.length === 0 ? translate[language].paymentsNotFound : translate[language].paymentsFound,
      data: { payments }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const create = async (req) => {
  try {
    const payload = await formatPayment(req.payload);
    const payment = new Payment(payload);
    await payment.save();

    return {
      message: translate[language].paymentCreated,
      data: { payment }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const createList = async (req, h) => {
  try {
    const payments = await savePayments(req);
    return h.file(payments, { confine: false });
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const update = async (req) => {
  try {
    const payment = await Payment.findOneAndUpdate(
      { _id: req.params._id },
      { $set: flat(req.payload) },
      { new: true },
    );

    if (!payment) return Boom.notFound(translate[language].paymentNotFound);

    return {
      message: translate[language].paymentUpdated,
      data: { payment },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

module.exports = {
  list,
  create,
  createList,
  update,
};
