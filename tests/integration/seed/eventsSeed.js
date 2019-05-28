const { ObjectID } = require('mongodb');
const moment = require('moment');

const Event = require('../../../models/Event');
const { userList } = require('./usersSeed');
const { customersList } = require('./customersSeed');

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
    startDate: moment().set({ hour: 9 }),
    endDate: moment().set({ hour: 11 }),
    auxiliary: auxiliary._id,
    customer: customersList[0]._id,
    createdAt: moment().subtract(1, 'd').toDate(),
    subscription: customersList[0].subscriptions[0]._id,
  },
  {
    _id: new ObjectID(),
    type: 'intervention',
    status: 'contract_with_company',
    startDate: moment().set({ hour: 14 }),
    endDate: moment().set({ hour: 16 }),
    auxiliary: auxiliary._id,
    customer: customersList[0]._id,
    createdAt: moment().subtract(1, 'd').toDate(),
    subscription: customersList[0].subscriptions[1]._id,
  },
  {
    _id: new ObjectID(),
    type: 'intervention',
    status: 'contract_with_company',
    startDate: moment().add(2, 'months').set({ hour: 14 }),
    endDate: moment().add(2, 'months').set({ hour: 16 }),
    auxiliary: auxiliary._id,
    customer: customersList[0]._id,
    createdAt: moment().subtract(1, 'd').toDate(),
    subscription: customersList[0].subscriptions[1]._id,
  },
  {
    _id: new ObjectID(),
    type: 'intervention',
    status: 'contract_with_company',
    startDate: moment().add(2, 'months').set({ hour: 19 }),
    endDate: moment().add(2, 'months').set({ hour: 21 }),
    auxiliary: auxiliary._id,
    customer: customersList[0]._id,
    createdAt: moment().subtract(1, 'd').toDate(),
    subscription: customersList[0].subscriptions[2]._id,
  },
];

const populateEvents = async () => {
  await Event.deleteMany({});
  await Event.insertMany(eventsList);
};

module.exports = { eventsList, populateEvents };
