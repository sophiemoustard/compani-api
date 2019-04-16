const Boom = require('boom');
const moment = require('moment');

const Payment = require('../models/Payment');
const PaymentNumber = require('../models/PaymentNumber');
const { getDateQuery } = require('../helpers/utils');
const { REFUND, PAYMENT } = require('../helpers/constants');
const translate = require('../helpers/translate');

const { language } = translate;

const list = async (req) => {
  try {
    const { startDate, endDate, ...rest } = req.query;
    const query = rest;
    if (startDate || endDate) query.date = getDateQuery({ startDate, endDate });

    const payments = await Payment.find(query);

    return {
      message: payments.length === 0 ? translate[language].paymentsNotFound : translate[language].paymentsFound,
      data: { payments }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const create = async (req) => {
  try {
    const numberQuery = {};
    switch (req.payload.nature) {
      case REFUND:
        numberQuery.prefix = `REMB-${moment().format('YYMM')}`;
        break;
      case PAYMENT:
        numberQuery.prefix = `REG-${moment().format('YYMM')}`;
        break;
    }
    const number = await PaymentNumber.findOneAndUpdate(
      numberQuery,
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    const paymentNumber = `${number.prefix}${number.seq.toString().padStart(3, '0')}`;
    req.payload.number = paymentNumber;

    const payment = new Payment(req.payload);
    await payment.save();

    return {
      message: translate[language].paymentCreated,
      data: { payment }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

module.exports = {
  list,
  create,
};
