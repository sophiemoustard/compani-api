const { v4: uuidv4 } = require('uuid');
const { ObjectId } = require('mongodb');
const User = require('../../../src/models/User');
const Customer = require('../../../src/models/Customer');
const Contract = require('../../../src/models/Contract');
const Service = require('../../../src/models/Service');
const Event = require('../../../src/models/Event');
const Sector = require('../../../src/models/Sector');
const SectorHistory = require('../../../src/models/SectorHistory');
const UserCompany = require('../../../src/models/UserCompany');
const Surcharge = require('../../../src/models/Surcharge');
const DistanceMatrix = require('../../../src/models/DistanceMatrix');
const { authCompany, otherCompany, companyWithoutSubscription } = require('../../seed/authCompaniesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/db');
const { WEBAPP } = require('../../../src/helpers/constants');
const { auxiliaryRoleId, coachRoleId } = require('../../seed/authRolesSeed');

const contractId = new ObjectId();
const auxiliaryId = new ObjectId();
const customerId = new ObjectId();
const subscriptionIds = [new ObjectId(), new ObjectId(), new ObjectId(), new ObjectId()];
const serviceIds = [new ObjectId(), new ObjectId(), new ObjectId(), new ObjectId()];
const sectorId = new ObjectId();

const user = {
  _id: new ObjectId(),
  local: { email: 'test4@alenvi.io' },
  identity: { lastname: 'Toto' },
  refreshToken: uuidv4(),
  role: { client: coachRoleId },
  inactivityDate: '2018-11-01T12:52:27.461Z',
  origin: WEBAPP,
};

const auxiliary = {
  _id: auxiliaryId,
  identity: { firstname: 'Test7', lastname: 'Test7' },
  local: { email: 'test7@alenvi.io' },
  inactivityDate: '2019-06-01T00:00:00',
  refreshToken: uuidv4(),
  role: { client: auxiliaryRoleId },
  contracts: contractId,
  origin: WEBAPP,
  administrative: { phoneInvoice: { driveId: 'qwertyuioiuytrew' } },
};

const auxiliaryFromOtherCompany = {
  _id: new ObjectId(),
  identity: { firstname: 'Cricri', lastname: 'test' },
  local: { email: 'othercompany@alenvi.io' },
  refreshToken: uuidv4(),
  role: { client: auxiliaryRoleId },
  contracts: contractId,
  origin: WEBAPP,
};

const userCompanyList = [
  // old inactive user company
  {
    _id: new ObjectId(),
    user: user._id,
    company: companyWithoutSubscription._id,
    startDate: '2022-11-01T23:00:00.000Z',
    endDate: '2023-11-30T23:00:00.000Z',
  },
  { _id: new ObjectId(), user: user._id, company: authCompany._id },
  { _id: new ObjectId(), user: auxiliaryId, company: authCompany._id },
  { _id: new ObjectId(), user: auxiliaryFromOtherCompany._id, company: otherCompany._id },
];

const contract = {
  createdAt: '2018-12-04T16:34:04',
  serialNumber: 'aswertyujnmklk',
  endDate: '2023-01-28T22:59:59.000Z',
  endNotificationDate: '2023-01-27T23:00:00.000Z',
  endReason: 'mutation',
  user: auxiliaryId,
  startDate: '2018-12-03T00:00:00.000Z',
  _id: contractId,
  company: authCompany._id,
  versions: [
    {
      createdAt: '2018-12-04T16:34:04',
      endDate: null,
      grossHourlyRate: 10.28,
      startDate: '2018-12-03T00:00:00.000Z',
      weeklyHours: 9,
      _id: new ObjectId(),
    },
  ],
};

const eventList = [
  {
    _id: new ObjectId(),
    company: authCompany._id,
    type: 'intervention',
    startDate: '2023-01-05T09:00:00.000Z',
    endDate: '2023-01-05T12:00:00.000Z',
    auxiliary: auxiliaryId,
    customer: customerId,
    createdAt: '2023-01-01T09:00:00.000Z',
    sector: new ObjectId(),
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
    _id: new ObjectId(),
    company: authCompany._id,
    type: 'intervention',
    startDate: '2023-01-01T09:00:00.000Z',
    endDate: '2023-01-01T11:00:00.000Z',
    auxiliary: auxiliaryId,
    customer: customerId,
    createdAt: '2023-01-01T09:00:00.000Z',
    sector: new ObjectId(),
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
    _id: new ObjectId(),
    company: authCompany._id,
    type: 'intervention',
    startDate: '2023-01-01T15:00:00.000Z',
    endDate: '2023-01-01T16:00:00.000Z',
    auxiliary: auxiliaryId,
    customer: customerId,
    createdAt: '2023-01-01T10:00:00.000Z',
    sector: new ObjectId(),
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
    _id: new ObjectId(),
    company: authCompany._id,
    type: 'internal_hour',
    startDate: '2023-01-02T09:00:00.000Z',
    endDate: '2023-01-02T12:00:00.000Z',
    auxiliary: auxiliaryId,
    internalHour: { _id: new ObjectId(), name: 'Formation' },
  },
  {
    _id: new ObjectId(),
    company: authCompany._id,
    type: 'absence',
    absenceNature: 'hourly',
    absence: 'transport_accident',
    startDate: '2023-01-01T09:00:00.000Z',
    endDate: '2023-01-01T10:00:00.000Z',
    auxiliary: auxiliaryId,
    internalHour: { _id: new ObjectId(), name: 'Formation' },
  },
  // previous month
  {
    _id: new ObjectId(),
    company: authCompany._id,
    type: 'intervention',
    startDate: '2022-12-05T09:00:00.000Z',
    endDate: '2022-12-05T13:00:00.000Z',
    auxiliary: auxiliaryId,
    customer: customerId,
    createdAt: '2022-12-01T09:00:00.000Z',
    sector: new ObjectId(),
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
    _id: new ObjectId(),
    company: authCompany._id,
    type: 'intervention',
    startDate: '2022-12-01T15:00:00.000Z',
    endDate: '2022-12-01T16:30:00.000Z',
    auxiliary: auxiliaryId,
    customer: customerId,
    createdAt: '2023-01-01T10:00:00.000Z',
    sector: new ObjectId(),
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
    _id: new ObjectId(),
    company: authCompany._id,
    type: 'intervention',
    startDate: '2022-12-01T15:00:00.000Z',
    endDate: '2022-12-01T16:30:00.000Z',
    auxiliary: auxiliaryId,
    customer: customerId,
    createdAt: '2023-01-01T10:00:00.000Z',
    sector: new ObjectId(),
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
    _id: new ObjectId(),
    company: authCompany._id,
    type: 'internal_hour',
    startDate: '2022-12-02T09:00:00.000Z',
    endDate: '2022-12-02T12:00:00.000Z',
    auxiliary: auxiliaryId,
    internalHour: { _id: new ObjectId(), name: 'Formation' },
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
        weeklyHours: 12,
        evenings: 2,
        sundays: 1,
        startDate: '2018-01-01T10:00:00.000Z',
      }],
    },
    {
      _id: subscriptionIds[1],
      service: serviceIds[1],
      versions: [{
        unitTTCRate: 100,
        weeklyHours: 12,
        evenings: 0,
        sundays: 3,
        startDate: '2018-01-03T10:00:00.000Z',
      }],
    },
    {
      _id: subscriptionIds[2],
      service: serviceIds[2],
      versions: [{
        unitTTCRate: 4,
        weeklyHours: 14,
        evenings: 0,
        sundays: 1,
        startDate: '2018-01-03T10:00:00.000Z',
      }],
    },
    {
      _id: subscriptionIds[3],
      service: serviceIds[3],
      versions: [{
        unitTTCRate: 5,
        weeklyHours: 4,
        evenings: 0,
        sundays: 1,
        startDate: '2018-01-03T10:00:00.000Z',
      }],
    },
  ],
};

const surcharge = {
  _id: new ObjectId(),
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
      startDate: '2019-01-16T00:00:00.000Z',
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
      startDate: '2019-01-30T00:00:00.000Z',
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
      startDate: '2019-01-30T00:00:00.000Z',
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
      startDate: '2019-01-30T00:00:00.000Z',
      vat: 5,
      surcharge: surcharge._id,
    }],
    nature: 'hourly',
  },
];

const distanceMatrix = {
  _id: new ObjectId(),
  company: authCompany._id,
  origins: '30 Rue Traversière 75012 Paris',
  destinations: '62 Rue Brancion 75015 Paris',
  mode: 'driving',
  distance: 6532,
  duration: 1458,
};

const sector = { name: 'Toto', _id: sectorId, company: authCompany._id };

const sectorHistory = { auxiliary: auxiliaryId, sector: sectorId, company: authCompany._id, startDate: '2018-12-10' };

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    Contract.create(contract),
    Customer.create(customer),
    DistanceMatrix.create(distanceMatrix),
    Event.create(eventList),
    Sector.create(sector),
    SectorHistory.create(sectorHistory),
    Service.create(serviceList),
    Surcharge.create(surcharge),
    User.create([user, auxiliary, auxiliaryFromOtherCompany]),
    UserCompany.create(userCompanyList),
  ]);
};

module.exports = { populateDB, auxiliary, auxiliaryFromOtherCompany, surcharge };
