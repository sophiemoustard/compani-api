const { ObjectID } = require('mongodb');
const Company = require('../../../src/models/Company');
const { populateDBForAuthentication } = require('./authenticationSeed');

const company = {
  _id: new ObjectID('5d3eb871dd552f11866eea7b'),
  name: 'Test',
  tradeName: 'TT',
  rhConfig: {
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
  customersFolderId: 'mnbvcxz',
  prefixNumber: 103,
};

const populateDB = async () => {
  await Company.deleteMany({});

  await populateDBForAuthentication();
  await (new Company(company)).save();
};

module.exports = { company, populateDB };
