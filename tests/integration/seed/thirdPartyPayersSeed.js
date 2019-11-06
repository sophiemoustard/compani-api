const { ObjectID } = require('mongodb');
const ThirdPartyPayer = require('../../../src/models/ThirdPartyPayer');
const Company = require('../../../src/models/Company');
const { populateDBForAuthentification, authCompany } = require('./authentificationSeed');

const tppCompany = {
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

const thirdPartyPayersList = [
  {
    _id: new ObjectID(),
    name: 'Toto',
    company: authCompany._id,
  },
  {
    _id: new ObjectID(),
    name: 'Tata',
    company: authCompany._id,
  },
];

const thirdPartyPayerFromOtherCompany =   {
  _id: new ObjectID(),
  name: 'Tutu',
  company: tppCompany._id,
};

const populateDB = async () => {
  await ThirdPartyPayer.deleteMany({});
  await Company.deleteMany({});

  await populateDBForAuthentification();
  await ThirdPartyPayer.insertMany(thirdPartyPayersList);
  await ThirdPartyPayer.insertMany([thirdPartyPayerFromOtherCompany]);
  await new Company(tppCompany).save();
};

module.exports = { thirdPartyPayersList, populateDB, tppCompany, thirdPartyPayerFromOtherCompany };
