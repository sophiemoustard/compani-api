const { ObjectID } = require('mongodb');
const Event = require('../../../models/Event');
const { userList } = require('./usersSeed');
const { customersList } = require('./customersSeed');

const auxiliary = userList.find(user => user.role === 'Auxiliaire');

const eventsList = [
  {
    _id: new ObjectID(),
    type: 'intervention',
    startDate: '2019-01-17T10:30:18.653Z',
    endDate: '2019-01-17T12:00:18.653Z',
    auxiliary: auxiliary._id,
    customer: customersList[0]._id,
    createdAt: '2019-01-05T15:24:18.653Z',
    subscription: customersList[0].subscriptions[0]._id,
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
    startDate: '2019-01-18T09:30:18.653Z',
    endDate: '2019-01-18T12:30:18.653Z',
    auxiliary: auxiliary._id,
    customer: customersList[0]._id,
    createdAt: '2019-07-11T12:54:18.653Z',
    subscription: customersList[0].subscriptions[0]._id,
  },
];

const populateEvents = async () => {
  await Event.remove({});
  await Event.insertMany(eventsList);
};

module.exports = { eventsList, populateEvents };
