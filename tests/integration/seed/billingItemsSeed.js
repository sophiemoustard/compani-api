const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');
const BillingItem = require('../../../src/models/BillingItem');
const { authCompany } = require('../../seed/authCompaniesSeed');

const billingItemList = [
  { name: 'An existing billing', type: 'manual', defaultUnitAmount: 25, company: authCompany._id },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([BillingItem.create(billingItemList)]);
};

module.exports = {
  populateDB,
};
