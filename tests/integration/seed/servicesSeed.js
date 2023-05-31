const { ObjectId } = require('mongodb');
const Service = require('../../../src/models/Service');
const Customer = require('../../../src/models/Customer');
const BillingItem = require('../../../src/models/BillingItem');
const { HOURLY, FIXED } = require('../../../src/helpers/constants');
const { authCompany, otherCompany } = require('../../seed/authCompaniesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/db');

const servicesList = [
  {
    _id: new ObjectId(),
    company: authCompany._id,
    versions: [{
      defaultUnitAmount: 12,
      name: 'Service 1',
      startDate: '2019-01-16T00:00:00',
      vat: 12,
      exemptFromCharges: false,
    }],
    nature: HOURLY,
  },
  {
    _id: new ObjectId(),
    company: authCompany._id,
    versions: [{
      defaultUnitAmount: 24,
      name: 'Service 2',
      startDate: '2019-01-18T00:00:00',
      vat: 12,
      exemptFromCharges: false,
    }],
    nature: HOURLY,
  },
  {
    _id: new ObjectId(),
    company: authCompany._id,
    versions: [{
      defaultUnitAmount: 150,
      name: 'Service 3',
      startDate: '2019-01-16T00:00:00',
      vat: 12,
      exemptFromCharges: false,
    }],
    nature: FIXED,
  },
  {
    _id: new ObjectId(),
    company: authCompany._id,
    versions: [{
      defaultUnitAmount: 150,
      name: 'Service 3',
      startDate: '2019-01-16T00:00:00',
      vat: 12,
      exemptFromCharges: false,
    }],
    isArchived: true,
    nature: FIXED,
  },
];

const serviceFromOtherCompany = {
  _id: new ObjectId(),
  company: otherCompany._id,
  versions: [{
    defaultUnitAmount: 150,
    name: 'Service 3',
    startDate: '2019-01-16T00:00:00',
    vat: 12,
    exemptFromCharges: false,
  }],
  nature: FIXED,
};

const customer = {
  _id: new ObjectId(),
  company: authCompany._id,
  identity: { title: 'mr', firstname: 'withBills', lastname: 'customer' },
  driveFolder: { driveId: '1234567890' },
  subscriptions: [{
    _id: new ObjectId(),
    service: servicesList[2]._id,
    versions: [{ unitTTCRate: 12, weeklyHours: 12, evenings: 2, sundays: 1 }],
  }],
  contact: {
    primaryAddress: {
      fullAddress: '37 rue de ponthieu',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
    phone: '0612345678',
  },
};

const billingItemList = [
  {
    _id: new ObjectId(),
    name: 'Kill Billing',
    type: 'per_intervention',
    defaultUnitAmount: 2,
    company: authCompany._id,
    vat: 2,
  },
  { _id: new ObjectId(), name: 'Bill', type: 'manual', defaultUnitAmount: 25, company: otherCompany._id, vat: 2 },
  { _id: new ObjectId(), name: 'bil', type: 'manual', defaultUnitAmount: 25, company: authCompany._id, vat: 2 },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    Service.create([...servicesList, serviceFromOtherCompany]),
    Customer.create(customer),
    BillingItem.create(billingItemList),
  ]);
};

module.exports = { servicesList, populateDB, serviceFromOtherCompany, billingItemList };
