const uuidv4 = require('uuid/v4');
const { ObjectID } = require('mongodb');

const User = require('../../../src/models/User');
const Customer = require('../../../src/models/Customer');
const Contract = require('../../../src/models/Contract');
const Service = require('../../../src/models/Service');
const Event = require('../../../src/models/Event');
const Sector = require('../../../src/models/Sector');
const FinalPay = require('../../../src/models/FinalPay');
const { rolesList, populateDBForAuthentication, authCompany } = require('./authenticationSeed');

const contractId = new ObjectID();
const auxiliaryId = new ObjectID();
const customerId = new ObjectID();
const subscriptionId = new ObjectID();
const serviceId = new ObjectID();
const sectorId = new ObjectID();

const user = {
  _id: new ObjectID(),
  local: { email: 'test4@alenvi.io', password: '123456' },
  identity: { lastname: 'Toto' },
  refreshToken: uuidv4(),
  role: rolesList.find(role => role.name === 'coach')._id,
  inactivityDate: '2018-11-01T12:52:27.461Z',
};

const auxiliary = {
  _id: auxiliaryId,
  identity: { firstname: 'Test7', lastname: 'Test7' },
  local: { email: 'test7@alenvi.io', password: '123456' },
  inactivityDate: '2019-06-01T00:00:00',
  employee_id: 12345678,
  refreshToken: uuidv4(),
  role: rolesList.find(role => role.name === 'auxiliary')._id,
  contracts: contractId,
  sector: sectorId,
};

const contract = {
  createdAt: '2018-12-04T16:34:04',
  endDate: '2019-05-28T16:34:04',
  endNotificationDate: '2019-03-28T16:34:04',
  endReason: 'mutation',
  user: auxiliaryId,
  startDate: '2018-12-03T23:00:00.000Z',
  status: 'contract_with_company',
  _id: contractId,
  company: authCompany._id,
  versions: [
    {
      createdAt: '2018-12-04T16:34:04',
      endDate: null,
      grossHourlyRate: 10.28,
      startDate: '2018-12-03T23:00:00.000Z',
      weeklyHours: 9,
      _id: new ObjectID(),
    },
  ],
};

const event = {
  _id: new ObjectID(),
  type: 'intervention',
  status: 'contract_with_company',
  startDate: '2019-05-12T09:00:00',
  endDate: '2019-05-12T11:00:00',
  auxiliary: auxiliaryId,
  customer: customerId,
  createdAt: '2019-05-01T09:00:00',
  subscription: subscriptionId,
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
        startDate: '2018-01-01T10:00:00.000+01:00',
      }],
    },
  ],
};

const service = {
  _id: serviceId,
  type: 'contract_with_company',
  company: authCompany._id,
  versions: [{
    defaultUnitAmount: 12,
    name: 'Service 1',
    startDate: '2019-01-16 17:58:15.519',
    vat: 12,
  }],
  nature: 'hourly',
};

const sector = {
  name: 'Toto',
  _id: sectorId,
  company: authCompany._id,
};

const populateDB = async () => {
  await User.deleteMany({});
  await Customer.deleteMany({});
  await Service.deleteMany({});
  await Contract.deleteMany({});
  await Event.deleteMany({});
  await Sector.deleteMany({});
  await FinalPay.deleteMany({});

  await populateDBForAuthentication();
  await (new User(user)).save();
  await (new User(auxiliary)).save();
  await (new Customer(customer)).save();
  await (new Service(service)).save();
  await (new Event(event)).save();
  await (new Contract(contract)).save();
  await (new Sector(sector)).save();
};

module.exports = { populateDB };
