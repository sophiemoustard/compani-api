const uuidv4 = require('uuid/v4');
const { ObjectID } = require('mongodb');
const User = require('../../../models/User');
const Company = require('../../../models/Company');
const Task = require('../../../models/Task');
const Customer = require('../../../models/Customer');
const Service = require('../../../models/Service');
const Event = require('../../../models/Event');
const Sector = require('../../../models/Sector');
const Contract = require('../../../models/Contract');
const { rolesList, populateDBForAuthentification } = require('./authentificationSeed');

const company = {
  _id: new ObjectID(),
  name: 'Testtoto',
  rhConfig: {
    internalHours: [
      { name: 'Formation', default: true, _id: new ObjectID() },
      { name: 'Code', default: false, _id: new ObjectID() },
      { name: 'Gouter', default: false, _id: new ObjectID() },
    ],
    feeAmount: 12,
  },
  iban: 'FR3514508000505917721779B12',
  bic: 'RTYUIKJHBFRG',
  ics: '12345678',
  directDebitsFolderId: '1234567890',
};

const task = {
  _id: new ObjectID(),
  name: 'Test',
};

const sectorList = [{
  _id: new ObjectID(),
}];

const contractList = [{
  _id: new ObjectID(),
}];

const userList = [
  {
    _id: new ObjectID(),
    identity: { firstname: 'Auxiliary', lastname: 'White' },
    local: { email: 'white@alenvi.io', password: '123456' },
    role: rolesList.find(role => role.name === 'auxiliary')._id,
    administrative: {
      certificates: [{ driveId: '1234567890' }],
      driveFolder: { driveId: '0987654321' },
    },
    procedure: [{ task: task._id }],
    inactivityDate: null,
    sector: sectorList[0]._id,
    contracts: [contractList[0]._id],
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Admin1', lastname: 'Horseman' },
    local: { email: 'horseman@alenvi.io', password: '123456' },
    employee_id: 12345678,
    refreshToken: uuidv4(),
    company: company._id,
    role: rolesList.find(role => role.name === 'admin')._id,
    inactivityDate: '2018-11-01T12:52:27.461Z',
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Admin2', lastname: 'Vador' },
    local: { email: 'vador@alenvi.io', password: '123456' },
    refreshToken: uuidv4(),
    role: rolesList.find(role => role.name === 'admin')._id,
    inactivityDate: '2018-11-01T12:52:27.461Z',
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Admin3', lastname: 'Kitty' },
    local: { email: 'kitty@alenvi.io', password: '123456' },
    employee_id: 12345678,
    refreshToken: uuidv4(),
    role: rolesList.find(role => role.name === 'admin')._id,
    inactivityDate: '2018-11-01T12:52:27.461Z',
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Admin4', lastname: 'Trump' },
    local: { email: 'trump@alenvi.io', password: '123456' },
    inactivityDate: null,
    employee_id: 12345678,
    refreshToken: uuidv4(),
    role: rolesList.find(role => role.name === 'admin')._id,
    contracts: [new ObjectID()],
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Helper1', lastname: 'Carolyn' },
    local: { email: 'carolyn@alenvi.io', password: '123456' },
    inactivityDate: null,
    employee_id: 12345678,
    refreshToken: uuidv4(),
    role: rolesList.find(role => role.name === 'helper')._id,
    contracts: [new ObjectID()],
  },
];

const serviceList = [{
  _id: new ObjectID(),
  nature: 'hourly',
}];

const customerList = [
  {
    _id: new ObjectID(),
    subscriptions: [{
      _id: new ObjectID(),
      service: serviceList[0]._id,
    }],
    identity: { lastname: 'Giscard d\'Estaing' },
  },
];

const eventList = [
  {
    _id: new ObjectID(),
    type: 'intervention',
    customer: customerList[0]._id,
    subscription: customerList[0].subscriptions[0]._id,
    auxiliary: userList[0]._id,
    startDate: '2019-07-01T08:00:00.000+00:00',
    endDate: '2019-07-01T09:00:00.000+00:00',
  },
  {
    _id: new ObjectID(),
    type: 'intervention',
    customer: customerList[0]._id,
    subscription: customerList[0].subscriptions[0]._id,
    auxiliary: userList[0]._id,
    startDate: '2019-07-02T09:00:00.000+00:00',
    endDate: '2019-07-02T10:30:00.000+00:00',
  },
];

const userPayload = {
  identity: { firstname: 'Auxiliary2', lastname: 'Kirk' },
  local: { email: 'kirk@alenvi.io', password: '123456' },
  role: rolesList.find(role => role.name === 'auxiliary')._id,
  company: company._id,
};

const populateDB = async () => {
  await User.deleteMany({});
  await Company.deleteMany({});
  await Task.deleteMany({});
  await Customer.deleteMany({});
  await Service.deleteMany({});
  await Event.deleteMany({});
  await Sector.deleteMany({});
  await Contract.deleteMany({});

  await populateDBForAuthentification();
  for (const user of userList) {
    await new User(user).save();
  }
  await new Company(company).save();
  await new Task(task).save();
  await Customer.insertMany(customerList);
  await Service.insertMany(serviceList);
  await Event.insertMany(eventList);
  await Sector.insertMany(sectorList);
  await Contract.insertMany(contractList);
};

module.exports = {
  userList,
  customerList,
  userPayload,
  populateDB,
};
