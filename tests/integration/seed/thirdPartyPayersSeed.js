const { ObjectID } = require('mongodb');
const ThirdPartyPayer = require('../../../src/models/ThirdPartyPayer');
const Company = require('../../../src/models/Company');
const { populateDBForAuthentication, authCompany } = require('./authenticationSeed');

const tppCompany = {
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
  customersFolderId: 'mnbvcxz',
  auxiliariesFolderId: 'kjhgf',
  customersConfig: {
    billingPeriod: 'two_weeks',
  },
  prefixNumber: 103,
};

const thirdPartyPayersList = [
  {
    _id: new ObjectID(),
    name: 'Toto',
    company: authCompany._id,
    isApa: false,
  },
  {
    _id: new ObjectID(),
    name: 'Tata',
    company: authCompany._id,
    isApa: false,
  },
];

const thirdPartyPayerFromOtherCompany = {
  _id: new ObjectID(),
  name: 'Tutu',
  company: tppCompany._id,
  isApa: true,
};

const populateDB = async () => {
  await ThirdPartyPayer.deleteMany({});
  await Company.deleteMany({});

  await populateDBForAuthentication();
  await ThirdPartyPayer.insertMany(thirdPartyPayersList);
  await ThirdPartyPayer.insertMany([thirdPartyPayerFromOtherCompany]);
  await new Company(tppCompany).save();
};

module.exports = { thirdPartyPayersList, populateDB, tppCompany, thirdPartyPayerFromOtherCompany };
