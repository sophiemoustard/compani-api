const { ObjectID } = require('mongodb');

const Payment = require('../../../models/Payment');
const PaymentNumber = require('../../../models/PaymentNumber');
const { customersList } = require('./customersSeed');
const { thirdPartyPayersList } = require('./thirdPartyPayersSeed');
const { PAYMENT, REFUND, PAYMENT_TYPES } = require('../../../helpers/constants');

const paymentsList = [
  {
    _id: new ObjectID(),
    number: 'REG-1903201',
    date: '2019-05-26T15:47:42',
    customer: customersList[0]._id,
    client: thirdPartyPayersList[0]._id,
    netInclTaxes: 190,
    nature: PAYMENT,
    type: PAYMENT_TYPES[0],
  },
  {
    _id: new ObjectID(),
    number: 'REG-1903202',
    date: '2019-05-24T15:47:42',
    customer: customersList[0]._id,
    netInclTaxes: 390,
    nature: PAYMENT,
    type: PAYMENT_TYPES[2],
  },
  {
    _id: new ObjectID(),
    number: 'REG-1903203',
    date: '2019-05-27T12:10:20',
    customer: customersList[1]._id,
    client: thirdPartyPayersList[1]._id,
    netInclTaxes: 220,
    nature: REFUND,
    type: PAYMENT_TYPES[0],
  },
];

const populatePayments = async () => {
  await Payment.deleteMany({});
  await PaymentNumber.deleteMany({});
  await Payment.insertMany(paymentsList);
};

module.exports = { paymentsList, populatePayments };
