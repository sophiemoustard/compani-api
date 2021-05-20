const { ObjectID } = require('mongodb');
const { authCompany, otherCompany } = require('../../seed/companySeed');
const { populateDBForAuthentication } = require('./authenticationSeed');
const Partner = require('../../../src/models/Partner');

const partnersList = [
  {
    _id: new ObjectID(),
    identity: { firstname: 'Anne', lastname: 'Onyme' },
    partnerOrganization: new ObjectID(),
    company: authCompany._id,
    phone: '0712345678',
    email: 'onSaitPasDuCoup@alenvi.io',
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Alain', lastname: 'Terieur' },
    partnerOrganization: new ObjectID(),
    company: otherCompany._id,
  },
];

const populateDB = async () => {
  await Partner.deleteMany({});

  await populateDBForAuthentication();

  await Partner.insertMany(partnersList);
};

module.exports = {
  populateDB,
  partnersList,
};
