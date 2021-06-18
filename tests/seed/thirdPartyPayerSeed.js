const { ObjectID } = require('mongodb');
const { BILLING_DIRECT } = require('../../src/helpers/constants');
const { authCompany } = require('./companySeed');

const thirdPartyPayerList = [{
  _id: new ObjectID(),
  name: 'Toto',
  company: authCompany._id,
  isApa: true,
  billingMode: BILLING_DIRECT,
}];

module.exports = { thirdPartyPayerList };
