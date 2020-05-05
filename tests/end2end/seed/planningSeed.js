const moment = require('moment');
const Event = require('../../../src/models/Event');
const { populateAuthentication } = require('./authenticationSeed');
const { authCompany } = require('../../seed/companySeed');
const { customerList } = require('../../seed/customerSeed');
const { userList } = require('../../seed/userSeed');
const { NEVER, INTERVENTION, COMPANY_CONTRACT } = require('../../../src/helpers/constants');

const eventList = [
  {
    _id: '1234567890abcdef12345678',
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
    _id: '123456789012345678abcdef',
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
    _id: 'abcdef123456789012345678',
    type: INTERVENTION,
    status: COMPANY_CONTRACT,
    customer: customerList[0]._id,
    company: authCompany._id,
    auxiliary: userList[4]._id,
    repetition: { frequency: NEVER },
    startDate: moment().subtract(1, 'week').set('hours', 11).set('minutes', 15),
    endDate: moment().subtract(1, 'week').set('hours', 12).set('minutes', 30),
    address: customerList[0].contact.primaryAddress,
    subscription: customerList[0].subscriptions[0]._id,
  },
];

const populatePlanning = async () => {
  await Event.deleteMany({});
  await populateAuthentication();
  await Event.insertMany(eventList);
};

module.exports = { populatePlanning };
