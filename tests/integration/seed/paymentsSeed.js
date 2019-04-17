const { ObjectID } = require('mongodb');
const moment = require('moment');

const Payment = require('../../../models/Payment');
const PaymentNumber = require('../../../models/PaymentNumber');
const { customersList } = require('./customersSeed');
const { thirdPartyPayersList } = require('./thirdPartyPayersSeed');
const { PAYMENT, PAYMENT_TYPES } = require('../../../helpers/constants');

const paymentsList = [
  {
    _id: new ObjectID(),
    number: 'REG-1903201',
    date: moment().toDate(),
    customer: customersList[0]._id,
    client: thirdPartyPayersList[0]._id,
    netInclTaxes: 190,
    nature: PAYMENT,
    type: PAYMENT_TYPES[0],
  },
  {
    _id: new ObjectID(),
    number: 'REG-1903202',
    date: moment().toDate(),
    customer: customersList[0]._id,
    netInclTaxes: 390,
    nature: PAYMENT,
    type: PAYMENT_TYPES[2],
  }
];

const populatePayments = async () => {
  await Payment.remove({});
  await PaymentNumber.remove({});
  await Payment.insertMany(paymentsList);
};

module.exports = { paymentsList, populatePayments };
