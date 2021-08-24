const { ObjectID } = require('mongodb');
const { authCompany, otherCompany } = require('../../seed/authCompaniesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/initializeDB');
const PartnerOrganization = require('../../../src/models/PartnerOrganization');

const partnerOrganizationsList = [
  {
    _id: new ObjectID(),
    name: 'Gooogle',
    phone: '0123456789',
    email: 'skulysse@alenvi.io',
    address: {
      fullAddress: '24 avenue Daumesnil 75012 Paris',
      zipCode: '75012',
      city: 'Paris',
      street: '24 avenue Daumesnil',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
    company: authCompany._id,
  },
  { _id: new ObjectID(), name: 'EHPAD UTOUT', company: otherCompany._id },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await PartnerOrganization.insertMany(partnerOrganizationsList);
};

module.exports = {
  populateDB,
  partnerOrganizationsList,
};
