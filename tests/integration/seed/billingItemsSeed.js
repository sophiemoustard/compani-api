const { ObjectId } = require('mongodb');
const { deleteNonAuthenticationSeeds } = require('../helpers/db');
const BillingItem = require('../../../src/models/BillingItem');
const Service = require('../../../src/models/Service');
const Bill = require('../../../src/models/Bill');
const { authCompany, otherCompany } = require('../../seed/authCompaniesSeed');

const billingItemList = [
  { // 0
    _id: new ObjectId(),
    name: 'An existing billing',
    type: 'manual',
    defaultUnitAmount: 25,
    company: authCompany._id,
    vat: 2,
  },
  { // 1
    _id: new ObjectId(),
    name: 'Another billing',
    type: 'per_intervention',
    defaultUnitAmount: 25,
    company: authCompany._id,
    vat: 2,
  },
  { // 2 from other company
    _id: new ObjectId(),
    name: 'Billing ual',
    type: 'per_intervention',
    defaultUnitAmount: 25,
    company: otherCompany._id,
    vat: 2,
  },
  { // 3
    _id: new ObjectId(),
    name: 'A nice billing',
    type: 'per_intervention',
    defaultUnitAmount: 25,
    company: authCompany._id,
    vat: 2,
  },
  { // 4
    _id: new ObjectId(),
    name: 'Boule et Billing',
    type: 'per_intervention',
    defaultUnitAmount: 20,
    company: authCompany._id,
    vat: 2,
  },
];

const serviceList = [
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
      {
        name: 'Forfait nuit',
        defaultUnitAmount: 18,
        billingItems: [billingItemList[4]._id],
        startDate: '2010-09-03T00:00:00',
        exemptFromCharges: true,
      },
    ],
    company: authCompany._id,
  },
];

const billList = [
  {
    date: '2010-09-03T00:00:00',
    customer: new ObjectId(),
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
      {
        billingItem: billingItemList[2]._id,
        unitInclTaxes: 5,
        name: 'frais d\'intervention',
        count: 4,
        inclTaxes: 20,
        exclTaxes: 14,
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
    Service.create(serviceList),
    Bill.create(billList),
  ]);
};

module.exports = { populateDB, billingItemList };
