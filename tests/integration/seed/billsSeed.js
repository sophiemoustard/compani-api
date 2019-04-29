const { ObjectID } = require('mongodb');
const moment = require('moment');

const Bill = require('../../../models/Bill');
const { customersList } = require('./customersSeed');
const { thirdPartyPayersList } = require('./thirdPartyPayersSeed');
const { eventsList } = require('./eventsSeed');

const billsList = [
  {
    _id: new ObjectID(),
    date: moment().toDate(),
    customer: customersList[0]._id,
    client: thirdPartyPayersList[0]._id,
    netInclTaxes: 75.96,
    subscriptions: [{
      startDate: moment().toDate(),
      endDate: moment().add(6, 'months').toDate(),
      subscription: customersList[0].subscriptions[0]._id,
      vat: 5.5,
      events: [eventsList[2]._id],
      hours: 8,
      unitExclTaxes: 9,
      exclTaxes: 72,
      inclTaxes: 75.96,
      discount: 0,
    }]
  },
  {
    _id: new ObjectID(),
    date: moment().toDate(),
    customer: customersList[1]._id,
    netInclTaxes: 101.28,
    subscriptions: [{
      startDate: moment().toDate(),
      endDate: moment().add(6, 'months').toDate(),
      subscription: customersList[0].subscriptions[0]._id,
      vat: 5.5,
      events: [eventsList[2]._id],
      hours: 4,
      unitExclTaxes: 24,
      exclTaxes: 96,
      inclTaxes: 101.28,
      discount: 0,
    }]
  }
];

const populateBills = async () => {
  await Bill.deleteMany({});
  await Bill.insertMany(billsList);
};

module.exports = { billsList, populateBills };
