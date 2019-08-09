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
    identity: { firstname: 'Test2', lastname: 'Test2' },
    local: { email: 'test2@alenvi.io', password: '123456' },
    role: rolesList[2]._id,
    inactivityDate: null,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Test4', lastname: 'Test4' },
    local: { email: 'test4@alenvi.io', password: '123456' },
    employee_id: 12345678,
    refreshToken: uuidv4(),
    company: company._id,
    role: rolesList[0]._id,
    inactivityDate: '2018-11-01T12:52:27.461Z',
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Test5', lastname: 'Test5' },
    local: { email: 'test5@alenvi.io', password: '123456' },
    refreshToken: uuidv4(),
    role: rolesList[0]._id,
    inactivityDate: '2018-11-01T12:52:27.461Z',
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Test6', lastname: 'Test6' },
    local: { email: 'test6@alenvi.io', password: '123456' },
    employee_id: 12345678,
    refreshToken: uuidv4(),
    role: rolesList[0]._id,
    inactivityDate: '2018-11-01T12:52:27.461Z',
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Test7', lastname: 'Test7' },
    local: { email: 'test7@alenvi.io', password: '123456' },
    inactivityDate: null,
    employee_id: 12345678,
    refreshToken: uuidv4(),
    role: rolesList[0]._id,
    contracts: [new ObjectID()],
    administrative: {
      payDocuments: [{
        _id: new ObjectID('5d4d474417a73213b77ff62d'),
        nature: 'payslip',
        date: '2019-08-09T09:04:56.230Z',
        file: {
          driveId: '1H-nc20PtnYiGcKujEr1mTKUiUjT1dwa',
          link: 'https://drive.google.com/file/d/1H-nc20PtnYiGcKvfyas1mTKUJPyq1dwa/view?usp=drivesdk',
        },
      }],
    },
  },
];

const userPayload = {
  identity: { firstname: 'Test', lastname: 'Test' },
  local: { email: 'test1@alenvi.io', password: '123456' },
  role: rolesList.find(role => role.name === 'auxiliary')._id,
  company: company._id,
};

const populateDB = async () => {
  await User.deleteMany({});
  await Company.deleteMany({});

  await populateDBForAuthentification();
  await new User(userList[0]).save();
  await new User(userList[1]).save();
  await new User(userList[2]).save();
  await new User(userList[3]).save();
  await new User(userList[4]).save();
  await new Company(company).save();
};

module.exports = {
  userList,
  userPayload,
  populateDB,
};
