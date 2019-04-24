const Boom = require('boom');
const flat = require('flat');

const Payment = require('../models/Payment');
const { getDateQuery } = require('../helpers/utils');
const { savePayments } = require('../helpers/payments');
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
    return Boom.badImplementation();
  }
};

const create = async (req, h) => {
  try {
    const payments = await savePayments(req);

    if (typeof payments === 'string') {
      return h.file(payments, { confine: false });
    }

    return {
      message: translate[language].paymentCreated,
      data: { payments }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
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
    return Boom.badImplementation();
  }
};

module.exports = {
  list,
  create,
  update,
};
