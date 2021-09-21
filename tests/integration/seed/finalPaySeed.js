const { v4: uuidv4 } = require('uuid');
const { ObjectID } = require('mongodb');
const moment = require('moment');
const User = require('../../../src/models/User');
const Customer = require('../../../src/models/Customer');
const Contract = require('../../../src/models/Contract');
const Service = require('../../../src/models/Service');
const Event = require('../../../src/models/Event');
const Sector = require('../../../src/models/Sector');
const SectorHistory = require('../../../src/models/SectorHistory');
const UserCompany = require('../../../src/models/UserCompany');
const Surcharge = require('../../../src/models/Surcharge');
const { authCompany, otherCompany } = require('../../seed/authCompaniesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');
const { WEBAPP } = require('../../../src/helpers/constants');
const { auxiliaryRoleId, coachRoleId } = require('../../seed/authRolesSeed');

const contractId = new ObjectID();
const auxiliaryId = new ObjectID();
const customerId = new ObjectID();
const subscriptionIds = [new ObjectID(), new ObjectID(), new ObjectID(), new ObjectID()];
const serviceIds = [new ObjectID(), new ObjectID(), new ObjectID(), new ObjectID()];
const sectorId = new ObjectID();

const user = {
  _id: new ObjectID(),
  local: { email: 'test4@alenvi.io', password: '123456!eR' },
  identity: { lastname: 'Toto' },
  refreshToken: uuidv4(),
  role: { client: coachRoleId },
  inactivityDate: '2018-11-01T12:52:27.461Z',
  origin: WEBAPP,
};

const auxiliary = {
  _id: auxiliaryId,
  identity: { firstname: 'Test7', lastname: 'Test7' },
  local: { email: 'test7@alenvi.io', password: '123456!eR' },
  inactivityDate: '2019-06-01T00:00:00',
  refreshToken: uuidv4(),
  role: { client: auxiliaryRoleId },
  contracts: contractId,
  origin: WEBAPP,
  administrative: { transportInvoice: { transportType: 'private' }, phoneInvoice: { driveId: 'qwertyuioiuytrew' } },

};

const auxiliaryFromOtherCompany = {
  _id: new ObjectID(),
  identity: { firstname: 'Cricri', lastname: 'test' },
  local: { email: 'othercompany@alenvi.io', password: '123456!eR' },
  refreshToken: uuidv4(),
  role: { client: auxiliaryRoleId },
  contracts: contractId,
  origin: WEBAPP,
};

const userCompanyList = [
  { _id: new ObjectID(), user: user._id, company: authCompany._id },
  { _id: new ObjectID(), user: auxiliaryId, company: authCompany._id },
  { _id: new ObjectID(), user: auxiliaryFromOtherCompany._id, company: otherCompany._id },
];

const contract = {
  createdAt: '2018-12-04T16:34:04',
  serialNumber: 'aswertyujnmklk',
  endDate: moment('2022-05-28T23:59:59').toDate(),
  endNotificationDate: moment('2022-03-28T00:00:00').toDate(),
  endReason: 'mutation',
  user: auxiliaryId,
  startDate: moment('2018-12-03T00:00:00').toDate(),
  _id: contractId,
  company: authCompany._id,
  versions: [
    {
      createdAt: '2018-12-04T16:34:04',
      endDate: null,
      grossHourlyRate: 10.28,
      startDate: moment('2018-12-03T00:00:00').toDate(),
      weeklyHours: 9,
      _id: new ObjectID(),
    },
  ],
};

const eventList = [
  {
    _id: new ObjectID(),
    company: authCompany._id,
    type: 'intervention',
    startDate: '2022-05-12T09:00:00',
    endDate: '2022-05-12T11:00:00',
    auxiliary: auxiliaryId,
    customer: customerId,
    createdAt: '2022-05-01T09:00:00',
    sector: new ObjectID(),
    subscription: subscriptionIds[0],
    address: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    type: 'intervention',
    startDate: '2022-05-08T09:00:00',
    endDate: '2022-05-08T11:00:00',
    auxiliary: auxiliaryId,
    customer: customerId,
    createdAt: '2022-05-01T09:00:00',
    sector: new ObjectID(),
    subscription: subscriptionIds[1],
    address: {
      fullAddress: '30 Rue Traversière 75012 Paris',
      zipCode: '75012',
      city: 'Paris',
      street: '30 Rue Traversière',
      location: { type: 'Point', coordinates: [2.37413, 48.848278] },
    },
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    type: 'intervention',
    startDate: '2022-05-08T15:00:00',
    endDate: '2022-05-08T16:00:00',
    auxiliary: auxiliaryId,
    customer: customerId,
    createdAt: '2022-05-01T10:00:00',
    sector: new ObjectID(),
    subscription: subscriptionIds[2],
    address: {
      fullAddress: '62 Rue Brancion 75015 Paris',
      zipCode: '75015',
      city: 'Paris',
      street: '62 Rue Brancion',
      location: { type: 'Point', coordinates: [2.303387, 48.832701] },
    },
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    type: 'internal_hour',
    startDate: '2022-05-09T09:00:00',
    endDate: '2022-05-09T12:00:00.000Z',
    auxiliary: auxiliaryId,
    internalHour: { _id: new ObjectID(), name: 'Formation' },
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    type: 'absence',
    absenceNature: 'hourly',
    absence: 'transport_accident',
    startDate: '2022-05-08T09:00:00',
    endDate: '2022-05-08T10:00:00.000Z',
    auxiliary: auxiliaryId,
    internalHour: { _id: new ObjectID(), name: 'Formation' },
  },
  // previous month
  {
    _id: new ObjectID(),
    company: authCompany._id,
    type: 'intervention',
    startDate: '2022-04-12T09:00:00',
    endDate: '2022-04-12T13:00:00',
    auxiliary: auxiliaryId,
    customer: customerId,
    createdAt: '2022-05-01T09:00:00',
    sector: new ObjectID(),
    subscription: subscriptionIds[0],
    address: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    type: 'intervention',
    startDate: '2022-04-08T15:00:00',
    endDate: '2022-04-08T16:30:00',
    auxiliary: auxiliaryId,
    customer: customerId,
    createdAt: '2022-05-01T10:00:00',
    sector: new ObjectID(),
    subscription: subscriptionIds[1],
    address: {
      fullAddress: '30 Rue Traversière 75012 Paris',
      zipCode: '75012',
      city: 'Paris',
      street: '30 Rue Traversière',
      location: { type: 'Point', coordinates: [2.37413, 48.848278] },
    },
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    type: 'intervention',
    startDate: '2022-04-08T15:00:00',
    endDate: '2022-04-08T16:30:00',
    auxiliary: auxiliaryId,
    customer: customerId,
    createdAt: '2022-05-01T10:00:00',
    sector: new ObjectID(),
    subscription: subscriptionIds[3],
    address: {
      fullAddress: '62 Rue Brancion 75015 Paris',
      zipCode: '75015',
      city: 'Paris',
      street: '62 Rue Brancion',
      location: { type: 'Point', coordinates: [2.303387, 48.832701] },
    },
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    type: 'internal_hour',
    startDate: '2022-04-09T09:00:00',
    endDate: '2022-04-09T12:00:00.000Z',
    auxiliary: auxiliaryId,
    internalHour: { _id: new ObjectID(), name: 'Formation' },
  },
];

const customer = {
  _id: customerId,
  company: authCompany._id,
  identity: { title: 'mr', firstname: 'Toto', lastname: 'Tata' },
  sectors: ['1e*'],
  contact: {
    primaryAddress: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  subscriptions: [
    {
      _id: subscriptionIds[0],
      service: serviceIds[0],
      versions: [{
        unitTTCRate: 12,
        estimatedWeeklyVolume: 12,
        evenings: 2,
        sundays: 1,
        startDate: '2018-01-01T10:00:00.000',
      }],
    },
    {
      _id: subscriptionIds[1],
      service: serviceIds[1],
      versions: [{
        unitTTCRate: 100,
        estimatedWeeklyVolume: 12,
        evenings: 0,
        sundays: 3,
        startDate: '2018-01-03T10:00:00.000',
      }],
    },
    {
      _id: subscriptionIds[2],
      service: serviceIds[2],
      versions: [{
        unitTTCRate: 4,
        estimatedWeeklyVolume: 14,
        evenings: 0,
        sundays: 1,
        startDate: '2018-01-03T10:00:00.000',
      }],
    },
    {
      _id: subscriptionIds[3],
      service: serviceIds[3],
      versions: [{
        unitTTCRate: 5,
        estimatedWeeklyVolume: 4,
        evenings: 0,
        sundays: 1,
        startDate: '2018-01-03T10:00:00.000',
      }],
    },
  ],
};

const surcharge = {
  _id: new ObjectID(),
  name: 'surplus',
  sunday: 30,
  company: authCompany._id,
};

const serviceList = [
  {
    _id: serviceIds[0],
    company: authCompany._id,
    versions: [{
      defaultUnitAmount: 12,
      name: 'Service A',
      exemptFromCharges: false,
      startDate: '2019-01-16T00:00:00',
      vat: 12,
    }],
    nature: 'hourly',
  },
  {
    _id: serviceIds[1],
    company: authCompany._id,
    versions: [{
      defaultUnitAmount: 30,
      name: 'Service B',
      exemptFromCharges: true,
      startDate: '2019-01-30T00:00:00',
      vat: 20,
    }],
    nature: 'hourly',
  },
  {
    _id: serviceIds[2],
    company: authCompany._id,
    versions: [{
      defaultUnitAmount: 100,
      name: 'Service C',
      exemptFromCharges: true,
      startDate: '2019-01-30T00:00:00',
      vat: 5,
      surcharge: surcharge._id,
    }],
    nature: 'hourly',
  },
  {
    _id: serviceIds[3],
    company: authCompany._id,
    versions: [{
      defaultUnitAmount: 33,
      name: 'Service D',
      exemptFromCharges: false,
      startDate: '2019-01-30T00:00:00',
      vat: 5,
      surcharge: surcharge._id,
    }],
    nature: 'hourly',
  },
];

const sector = { name: 'Toto', _id: sectorId, company: authCompany._id };

const sectorHistory = { auxiliary: auxiliaryId, sector: sectorId, company: authCompany._id, startDate: '2018-12-10' };

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Surcharge.create(surcharge);
  await Sector.create(sector);
  await SectorHistory.create(sectorHistory);
  await User.create([user, auxiliary, auxiliaryFromOtherCompany]);
  await Customer.create(customer);
  await Service.create(serviceList);
  await Event.create(eventList);
  await Contract.create(contract);
  await UserCompany.insertMany(userCompanyList);
};

module.exports = { populateDB, auxiliary, auxiliaryFromOtherCompany, surcharge };
