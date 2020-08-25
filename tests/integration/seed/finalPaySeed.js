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
const FinalPay = require('../../../src/models/FinalPay');
const { rolesList, populateDBForAuthentication, authCompany, otherCompany } = require('./authenticationSeed');

const contractId = new ObjectID();
const auxiliaryId = new ObjectID();
const customerId = new ObjectID();
const subscriptionId = new ObjectID();
const serviceId = new ObjectID();
const sectorId = new ObjectID();

const user = {
  _id: new ObjectID(),
  local: { email: 'test4@alenvi.io', password: '123456!eR' },
  identity: { lastname: 'Toto' },
  refreshToken: uuidv4(),
  role: { client: rolesList.find(role => role.name === 'coach')._id },
  inactivityDate: '2018-11-01T12:52:27.461Z',
  company: authCompany._id,
};

const auxiliary = {
  _id: auxiliaryId,
  identity: { firstname: 'Test7', lastname: 'Test7' },
  local: { email: 'test7@alenvi.io', password: '123456!eR' },
  inactivityDate: '2019-06-01T00:00:00',
  employee_id: 12345678,
  refreshToken: uuidv4(),
  role: { client: rolesList.find(role => role.name === 'auxiliary')._id },
  contracts: contractId,
  sector: sectorId,
  company: authCompany._id,
};

const auxiliaryFromOtherCompany = {
  _id: new ObjectID(),
  identity: { firstname: 'toto', lastname: 'test' },
  local: { email: 'othercompany@alenvi.io', password: '123456!eR' },
  employee_id: 9876543,
  refreshToken: uuidv4(),
  role: { client: rolesList.find(role => role.name === 'auxiliary')._id },
  contracts: contractId,
  sector: sectorId,
  company: otherCompany._id,
};

const contract = {
  createdAt: '2018-12-04T16:34:04',
  endDate: moment('2019-05-28T23:59:59').toDate(),
  endNotificationDate: moment('2019-03-28T00:00:00').toDate(),
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

const event = {
  _id: new ObjectID(),
  company: authCompany._id,
  type: 'intervention',
  startDate: '2019-05-12T09:00:00',
  endDate: '2019-05-12T11:00:00',
  auxiliary: auxiliaryId,
  customer: customerId,
  createdAt: '2019-05-01T09:00:00',
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
        startDate: '2018-01-01T10:00:00.000',
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
    startDate: '2019-01-16T00:00:00',
    vat: 12,
  }],
  nature: 'hourly',
};

const sector = {
  name: 'Toto',
  _id: sectorId,
  company: authCompany._id,
};

const sectorHistory = {
  auxiliary: auxiliaryId,
  sector: sectorId,
  company: authCompany._id,
  startDate: '2018-12-10',
};

const populateDB = async () => {
  await User.deleteMany({});
  await Customer.deleteMany({});
  await Service.deleteMany({});
  await Contract.deleteMany({});
  await Event.deleteMany({});
  await Sector.deleteMany({});
  await SectorHistory.deleteMany({});
  await FinalPay.deleteMany({});

  await populateDBForAuthentication();
  await (new Sector(sector)).save();
  await SectorHistory.create(sectorHistory);
  await User.create([user, auxiliary, auxiliaryFromOtherCompany]);
  await (new Customer(customer)).save();
  await (new Service(service)).save();
  await (new Event(event)).save();
  await (new Contract(contract)).save();
};

module.exports = { populateDB, auxiliary, auxiliaryFromOtherCompany };
