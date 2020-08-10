const { ObjectID } = require('mongodb');
const Service = require('../../../src/models/Service');
const { HOURLY, FIXED } = require('../../../src/helpers/constants');
const { populateDBForAuthentication, authCompany, otherCompany } = require('./authenticationSeed');

const servicesList = [
  {
    _id: new ObjectID(),
    company: authCompany._id,
    versions: [{
      defaultUnitAmount: 12,
      name: 'Service 1',
      startDate: '2019-01-16T17:58:15.519',
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
      startDate: '2019-01-18T19:58:15.519',
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
      startDate: '2019-01-16T17:58:15.519',
      vat: 12,
      exemptFromCharges: false,
    }],
    nature: FIXED,
  },
];

const serviceFromOtherCompany = {
  _id: new ObjectID(),
  company: otherCompany._id,
  versions: [{
    defaultUnitAmount: 150,
    name: 'Service 3',
    startDate: '2019-01-16T17:58:15.519',
    vat: 12,
    exemptFromCharges: false,
  }],
  nature: FIXED,
};

const populateDB = async () => {
  await Service.deleteMany({});

  await populateDBForAuthentication();

  await Service.insertMany(servicesList);
  await Service.insertMany([serviceFromOtherCompany]);
};

module.exports = { servicesList, populateDB, serviceFromOtherCompany };
