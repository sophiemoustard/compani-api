const { ObjectID } = require('mongodb');
const Sector = require('../../../src/models/Sector');
const Company = require('../../../src/models/Company');
const { populateDBForAuthentication, authCompany } = require('./authenticationSeed');

const sectorCompany = {
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
  folderId: '0987654321',
  directDebitsFolderId: '1234567890',
  customersConfig: {
    billingPeriod: 'two_weeks',
  },
};

const sectorsList = [
  {
    _id: new ObjectID(),
    name: 'Test',
    company: authCompany._id,
  },
  {
    _id: new ObjectID(),
    name: 'Test',
    company: sectorCompany._id,
  },
  {
    _id: new ObjectID(),
    name: 'Test2',
    company: sectorCompany._id,
  },
];


const populateDB = async () => {
  await Sector.deleteMany({});
  await Company.deleteMany({});

  await populateDBForAuthentication();
  await Sector.insertMany(sectorsList);
  await (new Company(sectorCompany)).save();
};

module.exports = { sectorsList, populateDB, sectorCompany };
