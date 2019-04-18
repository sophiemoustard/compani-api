const moment = require('moment');

const Payment = require('../models/Payment');
const PaymentNumber = require('../models/PaymentNumber');
const { REFUND, PAYMENT } = require('./constants');

const createPayments = async (payments) => {
  if (Object.prototype.toString.call(payments) === '[object Object]') payments = [payments];
  const promises = [];
  for (const payment of payments) {
    const numberQuery = {};
    switch (payment.nature) {
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
    payment.number = paymentNumber;

    const savedPayment = new Payment(payment);
    promises.push(savedPayment.save());
  }

  return Promise.all(promises);
};

module.exports = { createPayments };
