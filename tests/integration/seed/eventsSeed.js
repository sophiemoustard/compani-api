const { ObjectID } = require('mongodb');

const Event = require('../../../models/Event');
const { userList } = require('./usersSeed');
const { customersList } = require('./customersSeed');
const { thirdPartyPayersList } = require('./thirdPartyPayersSeed');

const auxiliary = userList[4];

const eventsList = [
  {
    _id: new ObjectID(),
    type: 'internalHour',
    startDate: '2019-01-17T10:30:18.653Z',
    endDate: '2019-01-17T12:00:18.653Z',
    auxiliary: auxiliary._id,
    customer: customersList[0]._id,
    createdAt: '2019-01-05T15:24:18.653Z',
    internalHour: {
      _id: new ObjectID(),
      name: 'Formation',
      default: false,
    }
  },
  {
    _id: new ObjectID(),
    type: 'absence',
    startDate: '2019-01-19T14:00:18.653Z',
    endDate: '2019-01-19T17:00:18.653Z',
    auxiliary: auxiliary._id,
    createdAt: '2019-01-11T08:38:18.653Z',
  },
  {
    _id: new ObjectID(),
    type: 'intervention',
    status: 'contract_with_company',
    startDate: '2019-01-16T09:30:19.543Z',
    endDate: '2019-01-16T11:30:21.653Z',
    auxiliary: auxiliary._id,
    customer: customersList[0]._id,
    createdAt: '2019-01-15T11:33:14.343Z',
    subscription: customersList[0].subscriptions[0]._id,
  },
  {
    _id: new ObjectID(),
    type: 'intervention',
    status: 'contract_with_company',
    startDate: '2019-01-17T14:30:19.543Z',
    endDate: '2019-01-17T16:30:19.543Z',
    auxiliary: auxiliary._id,
    customer: customersList[0]._id,
    createdAt: '2019-01-16T14:30:19.543Z',
    subscription: customersList[0].subscriptions[0]._id,
  },
  {
    _id: new ObjectID(),
    type: 'intervention',
    status: 'contract_with_company',
    startDate: '2019-01-16T09:30:19.543Z',
    endDate: '2019-01-16T11:30:21.653Z',
    auxiliary: auxiliary._id,
    customer: customersList[0]._id,
    createdAt: '2019-01-15T11:33:14.343Z',
    subscription: customersList[0].subscriptions[0]._id,
    isBilled: true,
    bills: {
      thirdPartyPayer: thirdPartyPayersList[0]._id,
      inclTaxesCustomer: 20,
      exclTaxesCustomer: 15,
      inclTaxesTpp: 10,
      exclTaxesTpp: 5,
      fundingVersion: new ObjectID(),
      nature: 'hourly',
      careHours: 2,
    },
  },
  {
    _id: new ObjectID(),
    type: 'intervention',
    status: 'contract_with_company',
    startDate: '2019-01-17T14:30:19.543Z',
    endDate: '2019-01-17T16:30:19.543Z',
    auxiliary: auxiliary._id,
    customer: customersList[0]._id,
    createdAt: '2019-01-16T14:30:19.543Z',
    subscription: customersList[0].subscriptions[0]._id,
    isBilled: true,
    bills: {
      inclTaxesCustomer: 20,
      exclTaxesCustomer: 15,
    },
  },
  {
    _id: new ObjectID(),
    type: 'intervention',
    status: 'contract_with_company',
    startDate: '2019-07-17T14:30:19.543Z',
    endDate: '2019-07-17T16:30:19.543Z',
    auxiliary: auxiliary._id,
    customer: customersList[0]._id,
    createdAt: '2019-05-16T14:30:19.543Z',
    subscription: customersList[0].subscriptions[1]._id,
  },
  {
    _id: new ObjectID(),
    type: 'intervention',
    status: 'contract_with_company',
    startDate: '2019-07-17T19:30:19.543Z',
    endDate: '2019-07-17T21:30:19.543Z',
    auxiliary: auxiliary._id,
    customer: customersList[0]._id,
    createdAt: '2019-05-16T14:30:19.543Z',
    subscription: customersList[0].subscriptions[2]._id,
  },
];

const populateEvents = async () => {
  await Event.deleteMany({});
  await Event.insertMany(eventsList);
};

module.exports = { eventsList, populateEvents };
