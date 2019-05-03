const { ObjectID } = require('mongodb');

const ThirdPartyPayer = require('../../../models/ThirdPartyPayer');

const thirdPartyPayersList = [
  {
    _id: new ObjectID(),
    name: 'Toto'
  },
  {
    _id: new ObjectID(),
    name: 'Tata'
  }
];

const populateThirdPartyPayers = async () => {
  await ThirdPartyPayer.deleteMany({});
  await ThirdPartyPayer.insertMany(thirdPartyPayersList);
};

module.exports = { thirdPartyPayersList, populateThirdPartyPayers };
