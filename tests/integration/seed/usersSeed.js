const uuidv4 = require('uuid/v4');
const { ObjectID } = require('mongodb');
const User = require('../../../models/User');
const Company = require('../../../models/Company');
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

const userList = [
  {
    _id: new ObjectID(),
    identity: { firstname: 'Auxiliary', lastname: 'White' },
    local: { email: 'white@alenvi.io', password: '123456' },
    role: rolesList.find(role => role.name === 'auxiliary')._id,
    inactivityDate: null,
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

const userPayload = {
  identity: { firstname: 'Auxiliary2', lastname: 'Kirk' },
  local: { email: 'kirk@alenvi.io', password: '123456' },
  role: rolesList.find(role => role.name === 'auxiliary')._id,
  company: company._id,
};

const populateDB = async () => {
  await User.deleteMany({});
  await Company.deleteMany({});

  await populateDBForAuthentification();
  for (const user of userList) {
    await new User(user).save();
  }
  await new Company(company).save();
};

module.exports = {
  userList,
  userPayload,
  populateDB,
};
