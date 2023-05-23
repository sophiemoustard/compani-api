const { ObjectId } = require('mongodb');
const { authCompany, otherCompany } = require('../../seed/authCompaniesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/db');
const PartnerOrganization = require('../../../src/models/PartnerOrganization');

const authPartnerOrganizationsList = [
  {
    _id: new ObjectId(),
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
  { _id: new ObjectId(), name: 'EPHAD Awan', company: authCompany._id },
];

const otherPartnerOrganization = { _id: new ObjectId(), name: 'EHPAD UTOUT', company: otherCompany._id };

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await PartnerOrganization.create([...authPartnerOrganizationsList, otherPartnerOrganization]);
};

module.exports = {
  populateDB,
  authPartnerOrganizationsList,
  otherPartnerOrganization,
};
