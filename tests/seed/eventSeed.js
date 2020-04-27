const moment = require('moment');
const { ObjectID } = require('mongodb');
const { authCompany } = require('./companySeed');
const { customerList } = require('./customerSeed');
const { userList } = require('./userSeed');
const { NEVER, INTERVENTION, COMPANY_CONTRACT } = require('../../src/helpers/constants');

const eventList = [
  {
    _id: new ObjectID(),
    type: INTERVENTION,
    status: COMPANY_CONTRACT,
    customer: customerList[0]._id,
    company: authCompany._id,
    auxiliary: userList[2]._id,
    repetition: { frequency: NEVER },
    startDate: moment().set('hours', 10).set('minutes', 0),
    endDate: moment().set('hours', 12).set('minutes', 30),
    address: customerList[0].contact.primaryAddress,
    subscription: customerList[0].subscriptions[0]._id,
  },
  {
    _id: new ObjectID(),
    type: INTERVENTION,
    status: COMPANY_CONTRACT,
    customer: customerList[0]._id,
    company: authCompany._id,
    auxiliary: userList[2]._id,
    repetition: { frequency: NEVER },
    startDate: moment().subtract(1, 'week').set('hours', 18).set('minutes', 15),
    endDate: moment().subtract(1, 'week').set('hours', 20).set('minutes', 30),
    address: customerList[0].contact.primaryAddress,
    subscription: customerList[0].subscriptions[0]._id,
  },
  {
    _id: new ObjectID(),
    type: INTERVENTION,
    status: COMPANY_CONTRACT,
    customer: customerList[0]._id,
    company: authCompany._id,
    auxiliary: userList[2]._id,
    repetition: { frequency: NEVER },
    startDate: moment().subtract(1, 'week').set('hours', 11).set('minutes', 15),
    endDate: moment().subtract(1, 'week').set('hours', 12).set('minutes', 30),
    address: customerList[0].contact.primaryAddress,
    subscription: customerList[0].subscriptions[0]._id,
  },
];

module.exports = { eventList };
