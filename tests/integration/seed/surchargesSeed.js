const { ObjectID } = require('mongodb');
const Surcharge = require('../../../src/models/Surcharge');
const { authCompany, otherCompany } = require('./authenticationSeed');
const { deleteNonAuthenticationSeeds } = require('./initializeDB');

const surchargesList = [
  {
    _id: new ObjectID(),
    company: authCompany._id,
    name: 'Chasse aux monstres hivernaux',
    saturday: 25,
    sunday: 20,
    publicHoliday: 12,
    twentyFifthOfDecember: 50,
    firstOfMay: 30,
    firstOfJanuary: 32,
    evening: 10,
    eveningStartTime: '20:00',
    eveningEndTime: '23:00',
    custom: 200,
    customStartTime: '13:59',
    customEndTime: '14:01',
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    name: 'Chasse aux monstres estivaux',
    saturday: 30,
    sunday: 25,
    publicHoliday: 14,
    twentyFifthOfDecember: 55,
    firstOfMay: 35,
    firstOfJanuary: 32,
    evening: 15,
    eveningStartTime: '21:00',
    eveningEndTime: '23:59',
    custom: '',
    customStartTime: '',
    customEndTime: '',
  },
];

const surchargeFromOtherCompany = {
  _id: new ObjectID(),
  company: otherCompany._id,
  name: 'Chasse aux monstres estivaux',
  saturday: 30,
  sunday: 25,
  publicHoliday: 14,
  twentyFifthOfDecember: 55,
  firstOfMay: 35,
  firstOfJanuary: 26,
  evening: 15,
  eveningStartTime: '21:00',
  eveningEndTime: '23:59',
  custom: '',
  customStartTime: '',
  customEndTime: '',
};

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Surcharge.insertMany([...surchargesList, surchargeFromOtherCompany]);
};

module.exports = { surchargesList, populateDB, surchargeFromOtherCompany };
