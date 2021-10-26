const { ObjectID } = require('mongodb');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');
const BillingItem = require('../../../src/models/BillingItem');
const Service = require('../../../src/models/Service');
const Bill = require('../../../src/models/Bill');
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
      {
        name: 'Forfait nuit',
        defaultUnitAmount: 175,
        billingItems: [],
        startDate: '2010-09-03T00:00:00',
        exemptFromCharges: true,
      },
      {
        name: 'Forfait nuit',
        defaultUnitAmount: 180,
        billingItems: [billingItemList[1]._id],
        startDate: '2010-09-03T00:00:00',
        exemptFromCharges: true,
      },
    ],
    company: authCompany._id,
  },
];

const bills = [
  {
    date: '2010-09-03T00:00:00',
    customer: new ObjectID(),
    number: 'F1606120',
    type: 'manual',
    netInclTaxes: 880,
    billingItemList: [
      {
        billingItem: billingItemList[3]._id,
        unitInclTaxes: 1000,
        name: 'article de factu',
        count: 2,
        inclTaxes: 2000,
        exclTaxes: 200,
        vat: 5,
      },
    ],
    company: authCompany._id,
  },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    BillingItem.create(billingItemList),
    Service.create(services),
    Bill.create(bills),
  ]);
};

module.exports = {
  populateDB,
  billingItemList,
  services,
  bills,
};
