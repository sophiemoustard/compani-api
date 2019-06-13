const { ObjectID } = require('mongodb');

const Bill = require('../../../models/Bill');
const { customersList } = require('./customersSeed');
const { thirdPartyPayersList } = require('./thirdPartyPayersSeed');
const { eventsList } = require('./eventsSeed');

const billsList = [
  {
    _id: new ObjectID(),
    date: '2019-05-29',
    customer: customersList[0]._id,
    client: thirdPartyPayersList[0]._id,
    netInclTaxes: 75.96,
    subscriptions: [{
      startDate: '2019-05-29',
      endDate: '2019-11-29',
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
    date: '2019-05-25',
    customer: customersList[1]._id,
    netInclTaxes: 101.28,
    subscriptions: [{
      startDate: '2019-05-25',
      endDate: '2019-11-25',
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
