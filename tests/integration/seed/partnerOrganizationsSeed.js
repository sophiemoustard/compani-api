const { authCompany } = require('../../seed/companySeed');
const { populateDBForAuthentication } = require('./authenticationSeed');
const PartnerOrganization = require('../../../src/models/PartnerOrganization');

const partnerOrganizationsList = [
  {
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
];

const populateDB = async () => {
  await PartnerOrganization.deleteMany({});

  await populateDBForAuthentication();

  await PartnerOrganization.insertMany(partnerOrganizationsList);
};

module.exports = {
  populateDB,
  partnerOrganizationsList,
};
