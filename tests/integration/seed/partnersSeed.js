const { ObjectId } = require('mongodb');
const { authCompany, otherCompany } = require('../../seed/authCompaniesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/db');
const Partner = require('../../../src/models/Partner');

const partnersList = [
  {
    _id: new ObjectId(),
    identity: { firstname: 'Anne', lastname: 'Onyme' },
    partnerOrganization: new ObjectId(),
    company: authCompany._id,
    phone: '0712345678',
    email: 'onSaitPasDuCoup@alenvi.io',
  },
  {
    _id: new ObjectId(),
    identity: { firstname: 'Alain', lastname: 'Terieur' },
    partnerOrganization: new ObjectId(),
    company: otherCompany._id,
  },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Partner.create(partnersList);
};

module.exports = {
  populateDB,
  partnersList,
};
