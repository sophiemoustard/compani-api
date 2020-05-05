const { ObjectID } = require('mongodb');
const ThirdPartyPayer = require('../../../src/models/ThirdPartyPayer');
const { populateDBForAuthentication, authCompany, otherCompany } = require('./authenticationSeed');

const thirdPartyPayersList = [
  { _id: new ObjectID(), name: 'Toto', company: authCompany._id, isApa: false },
  { _id: new ObjectID(), name: 'Tata', company: authCompany._id, isApa: false },
];

const thirdPartyPayerFromOtherCompany = {
  _id: new ObjectID(),
  name: 'Tutu',
  company: otherCompany._id,
  isApa: true,
};

const populateDB = async () => {
  await ThirdPartyPayer.deleteMany({});

  await populateDBForAuthentication();
  await ThirdPartyPayer.insertMany(thirdPartyPayersList);
  await ThirdPartyPayer.insertMany([thirdPartyPayerFromOtherCompany]);
};

module.exports = { thirdPartyPayersList, populateDB, thirdPartyPayerFromOtherCompany };
