const { ObjectID } = require('mongodb');
const Surcharge = require('../../../src/models/Surcharge');
const Company = require('../../../src/models/Company');
const { populateDBForAuthentication, authCompany } = require('./authenticationSeed');

const company = {
  _id: new ObjectID('5d3eb871dd552f11866eea7b'),
  name: 'Test',
  tradeName: 'TT',
  rhConfig: {
    internalHours: [
      { name: 'Formation', default: true, _id: new ObjectID() },
      { name: 'Code', default: false, _id: new ObjectID() },
      { name: 'Gouter', default: false, _id: new ObjectID() },
    ],
    feeAmount: 12,
  },
  iban: 'FR3514508000505917721779B12',
  bic: 'RTYUIKJHBFRG',
  ics: '12345678',
  directDebitsFolderId: '1234567890',
};

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
  company: company._id,
  name: 'Chasse aux monstres estivaux',
  saturday: 30,
  sunday: 25,
  publicHoliday: 14,
  twentyFifthOfDecember: 55,
  firstOfMay: 35,
  evening: 15,
  eveningStartTime: '21:00',
  eveningEndTime: '23:59',
  custom: '',
  customStartTime: '',
  customEndTime: '',
};

const populateDB = async () => {
  await Surcharge.deleteMany({});
  await Company.deleteMany({});

  await populateDBForAuthentication();
  await Surcharge.insertMany(surchargesList);
  await Surcharge.insertMany([surchargeFromOtherCompany]);
  await (new Company(company)).save();
};

module.exports = { surchargesList, populateDB, surchargeFromOtherCompany };
