const { ObjectId } = require('mongodb');
const { BILLING_DIRECT } = require('../../../src/helpers/constants');
const ThirdPartyPayer = require('../../../src/models/ThirdPartyPayer');
const { authCompany, otherCompany } = require('../../seed/authCompaniesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/db');

const thirdPartyPayersList = [
  {
    _id: new ObjectId(),
    name: 'Toto',
    company: authCompany._id,
    isApa: false,
    billingMode: BILLING_DIRECT,
    teletransmissionId: '1234567890',
    teletransmissionType: 'AM',
    companyCode: '448',
  },
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

  await Promise.all([
    ThirdPartyPayer.create([...thirdPartyPayersList, thirdPartyPayerFromOtherCompany]),
  ]);
};

module.exports = { thirdPartyPayersList, populateDB, thirdPartyPayerFromOtherCompany };
