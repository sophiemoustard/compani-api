const uuidv4 = require('uuid/v4');
const { ObjectID } = require('mongodb');
const { DAILY, PAID_LEAVE } = require('../../../src/helpers/constants');
const Contract = require('../../../src/models/Contract');
const User = require('../../../src/models/User');
const Customer = require('../../../src/models/Customer');
const Event = require('../../../src/models/Event');
const { rolesList, getUser } = require('./authenticationSeed');
const { populateDBForAuthentication, authCompany, otherCompany } = require('./authenticationSeed');

const contractCustomer = {
  _id: new ObjectID(),
  company: authCompany._id,
  email: 'fake@test.com',
  identity: {
    title: 'mr',
    firstname: 'Romain',
    lastname: 'Bardet',
  },
  contact: {
    primaryAddress: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
    },
    phone: '0123456789',
  },
  subscriptions: [
    {
      _id: new ObjectID(),
      service: new ObjectID(),
      versions: [{
        unitTTCRate: 12,
        estimatedWeeklyVolume: 12,
        evenings: 2,
        sundays: 1,
        startDate: '2018-01-01T10:00:00.000+01:00',
      }],
    },
  ],
  payment: {
    bankAccountOwner: 'David gaudu',
    iban: '',
    bic: '',
    mandates: [
      { rum: 'R012345678903456789' },
    ],
  },
};

const otherCompanyContractUser = {
  _id: new ObjectID(),
  identity: { firstname: 'OCCU', lastname: 'OCCU' },
  local: { email: 'other-company-contract-user@alenvi.io', password: '123456' },
  inactivityDate: null,
  employee_id: 12345678,
  refreshToken: uuidv4(),
  role: rolesList[0]._id,
  contracts: [new ObjectID()],
  company: otherCompany._id,
};

const contractUser = {
  _id: new ObjectID(),
  identity: { firstname: 'Test7', lastname: 'Test7' },
  local: { email: 'test7@alenvi.io', password: '123456' },
  inactivityDate: null,
  employee_id: 12345678,
  refreshToken: uuidv4(),
  role: rolesList[0]._id,
  contracts: [new ObjectID()],
  company: authCompany._id,
};

const otherCompanyContract = {
  createdAt: '2018-12-04T16:34:04.144Z',
  endDate: null,
  user: otherCompanyContractUser._id,
  startDate: '2018-12-03T23:00:00.000Z',
  status: 'contract_with_company',
  _id: otherCompanyContractUser.contracts[0],
  company: otherCompany._id,
  versions: [
    {
      createdAt: '2018-12-04T16:34:04.144Z',
      endDate: null,
      grossHourlyRate: 10.28,
      startDate: '2018-12-03T23:00:00.000Z',
      weeklyHours: 9,
      _id: new ObjectID(),
    },
  ],
};

const customerFromOtherCompany = {
  _id: new ObjectID(),
  company: otherCompanyContract._id,
  identity: { firstname: 'customer', lastname: 'toto' },
  contact: {
    primaryAddress: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
    },
    phone: '0612345678',
  },
};

const contractsList = [
  {
    createdAt: '2018-12-04T16:34:04.144Z',
    user: contractUser._id,
    startDate: '2018-12-03T23:00:00.000Z',
    status: 'contract_with_company',
    _id: contractUser.contracts[0],
    company: authCompany._id,
    versions: [
      {
        createdAt: '2018-12-04T16:34:04.144Z',
        grossHourlyRate: 10.28,
        startDate: '2018-12-03T23:00:00.000Z',
        weeklyHours: 9,
        _id: new ObjectID(),
      },
    ],
  },
  {
    createdAt: '2018-08-02T17:12:55.144Z',
    endDate: null,
    company: authCompany._id,
    user: getUser('auxiliary')._id,
    startDate: '2018-08-02T17:12:55.144Z',
    status: 'contract_with_company',
    _id: new ObjectID(),
    versions: [
      {
        createdAt: '2018-08-02T17:12:55.144Z',
        endDate: null,
        grossHourlyRate: 10.12,
        startDate: '2018-08-02T17:12:55.144Z',
        weeklyHours: 15,
        _id: new ObjectID(),
      },
    ],
  },
  {
    createdAt: '2018-08-02T17:12:55.144Z',
    user: getUser('auxiliary')._id,
    startDate: '2018-08-02T17:12:55.144Z',
    endDate: '2018-09-02T17:12:55.144Z',
    status: 'contract_with_company',
    _id: new ObjectID(),
    company: authCompany._id,
    versions: [
      {
        createdAt: '2018-08-02T17:12:55.144Z',
        endDate: '2018-09-02T17:12:55.144Z',
        grossHourlyRate: 10.12,
        startDate: '2018-08-02T17:12:55.144Z',
        weeklyHours: 15,
        _id: new ObjectID(),
      },
    ],
  },
];

const contractEvents = [
  {
    _id: new ObjectID(),
    company: authCompany._id,
    sector: new ObjectID(),
    type: 'internalHour',
    startDate: '2019-08-08T14:00:18.653Z',
    endDate: '2019-08-08T16:00:18.653Z',
    auxiliary: contractUser._id,
    customer: contractCustomer._id,
    createdAt: '2019-01-05T15:24:18.653Z',
    internalHour: {
      _id: new ObjectID(),
      name: 'Formation',
    },
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    sector: new ObjectID(),
    type: 'absence',
    absence: PAID_LEAVE,
    absenceNature: DAILY,
    startDate: '2019-01-19T14:00:18.653Z',
    endDate: '2019-01-19T17:00:18.653Z',
    auxiliary: contractUser._id,
    createdAt: '2019-01-11T08:38:18.653Z',
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    sector: new ObjectID(),
    type: 'intervention',
    status: 'contract_with_company',
    startDate: '2019-01-16T09:30:19.543Z',
    endDate: '2019-01-16T11:30:21.653Z',
    auxiliary: contractUser._id,
    customer: contractCustomer._id,
    createdAt: '2019-01-15T11:33:14.343Z',
    subscription: contractCustomer.subscriptions[0]._id,
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    sector: new ObjectID(),
    type: 'intervention',
    status: 'contract_with_company',
    startDate: '2019-01-17T14:30:19.543Z',
    endDate: '2019-01-17T16:30:19.543Z',
    auxiliary: contractUser._id,
    customer: contractCustomer._id,
    createdAt: '2019-01-16T14:30:19.543Z',
    subscription: contractCustomer.subscriptions[0]._id,
  },
];

const populateDB = async () => {
  await Contract.deleteMany({});
  await User.deleteMany({});
  await Customer.deleteMany({});
  await Event.deleteMany({});

  await populateDBForAuthentication();
  await new User(contractUser).save();
  await new User(otherCompanyContractUser).save();
  await new Customer(contractCustomer).save();
  await new Customer(customerFromOtherCompany).save();
  await Contract.insertMany([...contractsList, otherCompanyContract]);
  await Event.insertMany(contractEvents);
};

module.exports = {
  contractsList,
  populateDB,
  contractUser,
  contractCustomer,
  contractEvents,
  otherCompanyContract,
  customerFromOtherCompany,
  otherCompanyContractUser,
};
