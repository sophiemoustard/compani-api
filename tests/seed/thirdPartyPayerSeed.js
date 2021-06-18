const { ObjectID } = require('mongodb');
const { authCompany } = require('./companySeed');

const thirdPartyPayerList = [{
  _id: new ObjectID(),
  name: 'Toto',
  company: authCompany._id,
  isApa: true,
  billingMode: 'direct',
}];

module.exports = { thirdPartyPayerList };
