const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');
const BillingItem = require('../../../src/models/BillingItem');
const { authCompany, otherCompany } = require('../../seed/authCompaniesSeed');

const billingItemList = [
  { name: 'An existing billing', type: 'manual', defaultUnitAmount: 25, company: authCompany._id },
  { name: 'An existing billing', type: 'per_intervention', defaultUnitAmount: 25, company: otherCompany._id },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([BillingItem.create(billingItemList)]);
};

module.exports = {
  populateDB,
};
