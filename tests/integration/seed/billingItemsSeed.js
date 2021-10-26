const { ObjectID } = require('mongodb');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');
const BillingItem = require('../../../src/models/BillingItem');
const { authCompany, otherCompany } = require('../../seed/authCompaniesSeed');

const billingItemList = [
  {
    _id: new ObjectID(),
    name: 'An existing billing',
    type: 'manual',
    defaultUnitAmount: 25,
    company: authCompany._id,
    vat: 2,
  },
  {
    _id: new ObjectID(),
    name: 'Another billing',
    type: 'per_intervention',
    defaultUnitAmount: 25,
    company: authCompany._id,
    vat: 2,
  },
  {
    _id: new ObjectID(),
    name: 'An existing billing',
    type: 'per_intervention',
    defaultUnitAmount: 25,
    company: otherCompany._id,
    vat: 2,
  },
  {
    _id: new ObjectID(),
    name: 'A nice billing',
    type: 'per_intervention',
    defaultUnitAmount: 25,
    company: authCompany._id,
    vat: 2,
  },
];

const services = [
  {
    nature: 'hourly',
    versions: [
      { name: 'Forfait nuit', defaultUnitAmount: 175, billingItems: [] },
      { name: 'Forfait nuit', defaultUnitAmount: 180, billingItems: [{ billingItem: billingItemList[1]._id }] },
    ],
    company: authCompany._id,
  },
];

const bills = [
  {
    customer: new ObjectID(),
    number: 'F1606120',
    netInclTaxes: 880,
    billingItemList: [{ billingItem: billingItemList[3]._id }],
    company: authCompany._id,
  },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([BillingItem.create(billingItemList)]);
};

module.exports = {
  populateDB,
  billingItemList,
  services,
  bills,
};
