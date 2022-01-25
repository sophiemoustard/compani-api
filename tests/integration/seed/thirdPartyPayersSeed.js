const { ObjectId } = require('mongodb');
const { BILLING_DIRECT } = require('../../../src/helpers/constants');
const ThirdPartyPayer = require('../../../src/models/ThirdPartyPayer');
const { authCompany, otherCompany } = require('../../seed/authCompaniesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');

const thirdPartyPayersList = [
  { _id: new ObjectId(), name: 'Toto', company: authCompany._id, isApa: false, billingMode: BILLING_DIRECT },
  { _id: new ObjectId(), name: 'Tata', company: authCompany._id, isApa: false, billingMode: BILLING_DIRECT },
];

const thirdPartyPayerFromOtherCompany = {
  _id: new ObjectId(),
  name: 'Tutu',
  company: otherCompany._id,
  isApa: true,
  billingMode: BILLING_DIRECT,
};

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await ThirdPartyPayer.insertMany([...thirdPartyPayersList, thirdPartyPayerFromOtherCompany]);
};

module.exports = { thirdPartyPayersList, populateDB, thirdPartyPayerFromOtherCompany };
