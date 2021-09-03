const { ObjectID } = require('mongodb');
const Service = require('../../../src/models/Service');
const Customer = require('../../../src/models/Customer');
const BillingItem = require('../../../src/models/BillingItem');
const { HOURLY, FIXED } = require('../../../src/helpers/constants');
const { authCompany, otherCompany } = require('../../seed/authCompaniesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');

const servicesList = [
  {
    _id: new ObjectID(),
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
    _id: new ObjectID(),
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
    _id: new ObjectID(),
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
    _id: new ObjectID(),
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
  _id: new ObjectID(),
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
  _id: new ObjectID(),
  company: authCompany._id,
  identity: { title: 'mr', firstname: 'withBills', lastname: 'customer' },
  driveFolder: { driveId: '1234567890' },
  subscriptions: [{
    _id: new ObjectID(),
    service: servicesList[2]._id,
    versions: [{ unitTTCRate: 12, estimatedWeeklyVolume: 12, evenings: 2, sundays: 1 }],
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
  { _id: new ObjectID(), name: 'Kill Billing', type: 'manual', defaultUnitAmount: 2, company: authCompany._id, vat: 2 },
  { _id: new ObjectID(), name: 'Bill', type: 'manual', defaultUnitAmount: 25, company: otherCompany._id, vat: 2 },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Service.insertMany([...servicesList, serviceFromOtherCompany]);
  await Customer.create(customer);
  await BillingItem.create(billingItemList);
};

module.exports = { servicesList, populateDB, serviceFromOtherCompany, billingItemList };
