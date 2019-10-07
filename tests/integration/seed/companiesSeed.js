const { ObjectID } = require('mongodb');
const Company = require('../../../src/models/Company');
const { populateDBForAuthentification } = require('./authentificationSeed');

const company = {
  _id: new ObjectID('5d3eb871dd552f11866eea7b'),
  name: 'Test',
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

const populateDB = async () => {
  await Company.deleteMany({});

  await populateDBForAuthentification();
  await (new Company(company)).save();
};

module.exports = { company, populateDB };
