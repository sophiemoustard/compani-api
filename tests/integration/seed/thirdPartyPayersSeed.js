const { ObjectID } = require('mongodb');
const { BILLING_DIRECT } = require('../../../src/helpers/constants');
const ThirdPartyPayer = require('../../../src/models/ThirdPartyPayer');
const { populateDBForAuthentication, authCompany, otherCompany } = require('./authenticationSeed');

const thirdPartyPayersList = [
  { _id: new ObjectID(), name: 'Toto', company: authCompany._id, isApa: false, billingMode: BILLING_DIRECT },
  { _id: new ObjectID(), name: 'Tata', company: authCompany._id, isApa: false, billingMode: BILLING_DIRECT },
];

const thirdPartyPayerFromOtherCompany = {
  _id: new ObjectID(),
  name: 'Tutu',
  company: otherCompany._id,
  isApa: true,
  billingMode: BILLING_DIRECT,
};

const populateDB = async () => {
  await ThirdPartyPayer.deleteMany();

  await populateDBForAuthentication();

  await ThirdPartyPayer.insertMany(thirdPartyPayersList);
  await ThirdPartyPayer.insertMany([thirdPartyPayerFromOtherCompany]);
};

module.exports = { thirdPartyPayersList, populateDB, thirdPartyPayerFromOtherCompany };
