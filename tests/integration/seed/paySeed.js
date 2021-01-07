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
const Pay = require('../../../src/models/Pay');
const { rolesList, populateDBForAuthentication, authCompany, otherCompany } = require('./authenticationSeed');
const { WEBAPP, UNPAID_LEAVE, DAILY, ABSENCE } = require('../../../src/helpers/constants');

const contractId1 = new ObjectID();
const contractId2 = new ObjectID();
const auxiliaryId1 = new ObjectID();
const auxiliaryId2 = new ObjectID();
const customerId = new ObjectID();
const subscriptionId = new ObjectID();
const serviceId = new ObjectID();
const sectors = [
  { name: 'Toto', _id: new ObjectID(), company: authCompany._id },
  { name: 'Titi', _id: new ObjectID(), company: authCompany._id },
  { name: 'Tutu', _id: new ObjectID(), company: otherCompany._id },
];
const sectorFromOtherCompany = { _id: new ObjectID(), name: 'Titi', company: otherCompany._id };

const user = {
  _id: new ObjectID(),
  local: { email: 'test4@alenvi.io', password: '123456!eR' },
  identity: { lastname: 'Toto' },
  refreshToken: uuidv4(),
  role: { client: rolesList.find(role => role.name === 'coach')._id },
  company: authCompany._id,
  origin: WEBAPP,
};

const auxiliaries = [{
  _id: auxiliaryId1,
  identity: { firstname: 'Test7', lastname: 'Test7' },
  local: { email: 'test7@alenvi.io', password: '123456!eR' },
  employee_id: 12345678,
  refreshToken: uuidv4(),
  role: { client: rolesList.find(role => role.name === 'auxiliary')._id },
  contracts: [contractId1],
  company: authCompany._id,
  origin: WEBAPP,
}, {
  _id: auxiliaryId2,
  identity: { firstname: 'OtherTest', lastname: 'Test8' },
  local: { email: 'test8@alenvi.io', password: '123456!eR' },
  employee_id: 12345679,
  refreshToken: uuidv4(),
  role: { client: rolesList.find(role => role.name === 'auxiliary')._id },
  contracts: [contractId2],
  company: authCompany._id,
  origin: WEBAPP,
}];

const auxiliaryFromOtherCompany = {
  _id: new ObjectID(),
  identity: { firstname: 'toto', lastname: 'test' },
  local: { email: 'othercompany@alenvi.io', password: '123456!eR' },
  employee_id: 9876543,
  refreshToken: uuidv4(),
  role: { client: rolesList.find(role => role.name === 'auxiliary')._id },
  contracts: [contractId2],
  sector: sectorFromOtherCompany._id,
  company: otherCompany._id,
  origin: WEBAPP,
};

const contracts = [{
  createdAt: '2021-12-04T16:34:04',
  serialNumber: 'sdfgdgfdgvc',
  user: auxiliaryId1,
  startDate: '2021-12-03T23:00:00.000Z',
  _id: contractId1,
  company: authCompany._id,
  versions: [
    {
      createdAt: '2021-12-03T16:34:04',
      endDate: null,
      grossHourlyRate: 10.28,
      startDate: '2021-12-03T23:00:00.000Z',
      weeklyHours: 9,
      _id: new ObjectID(),
    },
  ],
}, {
  createdAt: '2021-12-04T16:34:04',
  user: auxiliaryId2,
  serialNumber: 'dskfajdsfcbnnsdal',
  company: authCompany._id,
  startDate: '2021-12-03T23:00:00',
  _id: contractId2,
  endDate: '2022-10-03T23:00:00',
  endNotificationDate: '2022-03-03T23:00:00',
  endReason: 'resignation',
  versions: [
    {
      createdAt: '2021-12-04T16:34:04',
      endDate: '2022-03-03T23:00:00',
      grossHourlyRate: 10.28,
      startDate: '2021-12-03T23:00:00',
      weeklyHours: 7,
      _id: new ObjectID(),
    },
    {
      createdAt: '2021-12-04T16:34:04',
      endDate: '2022-10-01T23:00:00',
      grossHourlyRate: 10.28,
      startDate: '2021-12-03T23:00:00',
      weeklyHours: 7,
      _id: new ObjectID(),
    },
    {
      createdAt: '2021-12-04T16:34:04',
      endDate: '2022-10-03T23:00:00',
      grossHourlyRate: 10.28,
      startDate: '2022-10-01T23:00:01',
      weeklyHours: 7,
      _id: new ObjectID(),
    },
  ],
}];

const event = {
  _id: new ObjectID(),
  company: authCompany._id,
  type: 'intervention',
  startDate: '2022-05-12T09:00:00',
  endDate: '2022-05-12T11:00:00',
  auxiliary: auxiliaries[0],
  customer: customerId,
  createdAt: '2022-05-01T09:00:00',
  sector: new ObjectID(),
  subscription: subscriptionId,
  address: {
    fullAddress: '37 rue de ponthieu 75008 Paris',
    zipCode: '75008',
    city: 'Paris',
    street: '37 rue de Ponthieu',
    location: { type: 'Point', coordinates: [2.377133, 48.801389] },
  },
};

const absence = {
  _id: new ObjectID(),
  type: ABSENCE,
  company: authCompany._id,
  auxiliary: auxiliaries[0],
  absence: UNPAID_LEAVE,
  absenceNature: DAILY,
  startDate: '2022-11-12T09:00:00',
  endDate: '2022-11-16T21:29:29',
};

const customer = {
  _id: customerId,
  company: authCompany._id,
  identity: {
    title: 'mr',
    firstname: 'Toto',
    lastname: 'Tata',
  },
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
      _id: subscriptionId,
      service: serviceId,
      versions: [{
        unitTTCRate: 12,
        estimatedWeeklyVolume: 12,
        evenings: 2,
        sundays: 1,
        startDate: '2021-01-01T10:00:00.000+01:00',
      }],
    },
  ],
};

const service = {
  _id: serviceId,
  company: authCompany._id,
  versions: [{
    defaultUnitAmount: 12,
    name: 'Service 1',
    exemptFromCharges: false,
    startDate: '2022-01-16 17:58:15.519',
    vat: 12,
  }],
  nature: 'hourly',
};

const sectorHistories = [
  {
    auxiliary: auxiliaries[0]._id,
    sector: sectors[0]._id,
    company: authCompany._id,
    startDate: moment('2021-12-10').startOf('day').toDate(),
    endDate: moment('2022-12-11').endOf('day').toDate(),
  },
  {
    auxiliary: auxiliaries[0]._id,
    sector: sectors[1]._id,
    company: authCompany._id,
    startDate: moment('2022-12-12').startOf('day').toDate(),
  },
  {
    auxiliary: auxiliaries[1]._id,
    sector: sectors[1]._id,
    company: authCompany._id,
    startDate: moment('2021-12-10').startOf('day').toDate(),
  },
];

const populateDB = async () => {
  await User.deleteMany({});
  await Customer.deleteMany({});
  await Service.deleteMany({});
  await Contract.deleteMany({});
  await Event.deleteMany({});
  await Sector.deleteMany({});
  await SectorHistory.deleteMany({});
  await Pay.deleteMany({});

  await populateDBForAuthentication();
  await Sector.create([...sectors, sectorFromOtherCompany]);
  await SectorHistory.create(sectorHistories);
  await User.create([user, ...auxiliaries, auxiliaryFromOtherCompany]);
  await (new Customer(customer)).save();
  await (new Service(service)).save();
  await Event.create([event, absence]);
  await Contract.insertMany(contracts);
};

module.exports = {
  populateDB,
  auxiliaries,
  auxiliaryFromOtherCompany,
  sectors,
  sectorFromOtherCompany,
};
