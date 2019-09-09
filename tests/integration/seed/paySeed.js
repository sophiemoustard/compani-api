const uuidv4 = require('uuid/v4');
const { ObjectID } = require('mongodb');

const User = require('../../../models/User');
const Customer = require('../../../models/Customer');
const Contract = require('../../../models/Contract');
const Service = require('../../../models/Service');
const Event = require('../../../models/Event');
const Company = require('../../../models/Company');
const Sector = require('../../../models/Sector');
const Pay = require('../../../models/Pay');
const { rolesList, populateDBForAuthentification } = require('./authentificationSeed');

const contractId1 = new ObjectID();
const contractId2 = new ObjectID();
const auxiliaryId1 = new ObjectID();
const auxiliaryId2 = new ObjectID();
const customerId = new ObjectID();
const subscriptionId = new ObjectID();
const serviceId = new ObjectID();
const companyId = new ObjectID();
const sectorId = new ObjectID();

const user = {
  _id: new ObjectID(),
  local: { email: 'test4@alenvi.io', password: '123456' },
  identity: { lastname: 'Toto' },
  refreshToken: uuidv4(),
  role: rolesList.find(role => role.name === 'coach')._id,
  inactivityDate: '2018-11-01T12:52:27.461Z',
};

const auxiliary1 = {
  _id: auxiliaryId1,
  identity: { firstname: 'Test7', lastname: 'Test7' },
  local: { email: 'test7@alenvi.io', password: '123456' },
  employee_id: 12345678,
  refreshToken: uuidv4(),
  role: rolesList.find(role => role.name === 'auxiliary')._id,
  contracts: contractId1,
  sector: sectorId,
};

const auxiliary2 = {
  _id: auxiliaryId2,
  identity: { firstname: 'Test8', lastname: 'Test8' },
  local: { email: 'test8@alenvi.io', password: '123456' },
  employee_id: 12345679,
  refreshToken: uuidv4(),
  role: rolesList.find(role => role.name === 'auxiliary')._id,
  contracts: contractId2,
  sector: sectorId,
};

const contracts = [{
  createdAt: '2018-12-04T16:34:04',
  user: auxiliaryId1,
  startDate: '2018-12-03T23:00:00.000Z',
  status: 'contract_with_company',
  _id: contractId1,
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
}, {
  createdAt: '2018-12-04T16:34:04',
  user: auxiliaryId2,
  startDate: '2018-12-03T23:00:00.000Z',
  status: 'contract_with_company',
  _id: contractId2,
  endDate: '2019-03-03T23:00:00.000Z',
  endNotificationDate: '2019-03-03T23:00:00.000Z',
  endReason: 'resignation',
  versions: [
    {
      createdAt: '2018-12-04T16:34:04',
      endDate: '2019-03-03T23:00:00.000Z',
      grossHourlyRate: 10.28,
      startDate: '2018-12-03T23:00:00.000Z',
      weeklyHours: 7,
      _id: new ObjectID(),
    },
  ],
}];

const event = {
  _id: new ObjectID(),
  type: 'intervention',
  status: 'contract_with_company',
  startDate: '2019-05-12T09:00:00',
  endDate: '2019-05-12T11:00:00',
  auxiliary: auxiliaryId1,
  customer: customerId,
  createdAt: '2019-05-01T09:00:00',
  subscription: subscriptionId,
};

const customer = {
  _id: customerId,
  identity: {
    title: 'M',
    firstname: 'Toto',
    lastname: 'Tata',
  },
  sectors: ['1e*'],
  contact: {
    address: {
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
  company: companyId,
  versions: [{
    defaultUnitAmount: 12,
    name: 'Service 1',
    startDate: '2019-01-16 17:58:15.519',
    vat: 12,
  }],
  nature: 'hourly',
};

const company = {
  _id: companyId,
  rhConfig: {
    internalHours: [
      { name: 'Formation', default: true, _id: new ObjectID() },
      { name: 'Code', default: false, _id: new ObjectID() },
      { name: 'Gouter', default: false, _id: new ObjectID() },
    ],
    feeAmount: 12,
    transportSubs: [{ department: '75', price: 20 }],
  },
};

const sector = { name: 'Toto', _id: sectorId };

const populateDB = async () => {
  await User.deleteMany({});
  await Customer.deleteMany({});
  await Service.deleteMany({});
  await Contract.deleteMany({});
  await Event.deleteMany({});
  await Company.deleteMany({});
  await Sector.deleteMany({});
  await Pay.deleteMany({});

  await populateDBForAuthentification();
  await (new User(user)).save();
  await (new User(auxiliary1)).save();
  await (new User(auxiliary2)).save();
  await (new Customer(customer)).save();
  await (new Service(service)).save();
  await (new Event(event)).save();
  await Contract.insertMany(contracts);
  await (new Company(company)).save();
  await (new Sector(sector)).save();
};

module.exports = { populateDB };
