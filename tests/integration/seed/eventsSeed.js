const { ObjectID } = require('mongodb');
const uuidv4 = require('uuid/v4');
const Event = require('../../../src/models/Event');
const User = require('../../../src/models/User');
const Customer = require('../../../src/models/Customer');
const Repetition = require('../../../src/models/Repetition');
const ThirdPartyPayer = require('../../../src/models/ThirdPartyPayer');
const Contract = require('../../../src/models/Contract');
const Service = require('../../../src/models/Service');
const EventHistory = require('../../../src/models/EventHistory');
const Sector = require('../../../src/models/Sector');
const { rolesList, populateDBForAuthentication, authCompany } = require('./authenticationSeed');
const app = require('../../../server');
const { EVERY_WEEK } = require('../../../src/helpers/constants');

const auxiliaryId = new ObjectID();
const planningReferentId = new ObjectID();

const contracts = [{
  _id: new ObjectID(),
  status: 'contract_with_company',
  user: auxiliaryId,
  startDate: '2010-09-03T00:00:00',
  company: authCompany._id,
  versions: [{
    startDate: '2010-09-03T00:00:00',
    grossHourlyRate: 10.43,
    weeklyHours: 12,
  }],
}, {
  _id: new ObjectID(),
  status: 'contract_with_company',
  user: planningReferentId,
  company: authCompany._id,
  startDate: '2010-09-03T00:00:00',
  versions: [{
    startDate: '2010-09-03T00:00:00',
    grossHourlyRate: 10.43,
    weeklyHours: 12,
  }],
}];

const sector = {
  _id: new ObjectID(),
  name: 'Paris',
  company: authCompany._id,
};

const eventAuxiliary = {
  _id: auxiliaryId,
  identity: { firstname: 'Thibaut', lastname: 'Pinot' },
  local: { email: 't@p.com', password: 'tourdefrance' },
  administrative: { driveFolder: { driveId: '1234567890' } },
  refreshToken: uuidv4(),
  role: rolesList[1]._id,
  contracts: [contracts[0]._id],
  sector: sector._id,
  company: authCompany._id,
};

const thirdPartyPayer = {
  _id: new ObjectID('62400565f8fd3555379720c9'),
  company: authCompany._id,
};

const service = {
  _id: new ObjectID('5d3b239ce9e4352ef86e773b'),
  company: authCompany._id,
  versions: [
    { _id: new ObjectID() },
  ],
};

const customerAuxiliary = {
  _id: new ObjectID('b0e491d37f0094ba49499562'),
  company: authCompany._id,
  identity: { firstname: 'Romain', lastname: 'Bardet' },
  subscriptions: [
    { _id: new ObjectID('8b4c4f60d11f95df92d63859'), startDate: '2019-09-03T00:00:00', service: service._id },
  ],
  contact: {
    primaryAddress: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
    },
    phone: '0612345678',
  },
};

const helpersCustomer = {
  _id: new ObjectID(),
  identity: { firstname: 'Nicolas', lastname: 'Flammel' },
  local: { email: 'tt@tt.com', password: 'mdpdeouf' },
  refreshToken: uuidv4(),
  customers: [customerAuxiliary._id],
  role: rolesList[4]._id,
  company: authCompany._id,
};

const repetitionParentId = new ObjectID();
const repetitions = [{ _id: new ObjectID(), parentId: repetitionParentId, repetition: { frequency: EVERY_WEEK } }];

const eventsList = [
  {
    _id: new ObjectID(),
    sector: sector._id,
    type: 'internalHour',
    startDate: '2019-01-17T10:30:18.653Z',
    endDate: '2019-01-17T12:00:18.653Z',
    auxiliary: eventAuxiliary._id,
    customer: customerAuxiliary._id,
    createdAt: '2019-01-05T15:24:18.653Z',
    internalHour: {
      _id: new ObjectID(),
      name: 'Formation',
    },
  },
  {
    _id: new ObjectID(),
    sector: sector._id,
    type: 'absence',
    startDate: '2019-01-19T14:00:18.653Z',
    endDate: '2019-01-19T17:00:18.653Z',
    auxiliary: eventAuxiliary._id,
    createdAt: '2019-01-11T08:38:18.653Z',
  },
  {
    _id: new ObjectID(),
    sector: sector._id,
    type: 'intervention',
    status: 'contract_with_company',
    startDate: '2019-01-16T09:30:19.543Z',
    endDate: '2019-01-16T11:30:21.653Z',
    auxiliary: eventAuxiliary._id,
    customer: customerAuxiliary._id,
    createdAt: '2019-01-15T11:33:14.343Z',
    subscription: customerAuxiliary.subscriptions[0]._id,
  },
  {
    _id: new ObjectID(),
    sector: sector._id,
    type: 'intervention',
    status: 'contract_with_company',
    startDate: '2019-01-17T14:30:19.543Z',
    endDate: '2019-01-17T16:30:19.543Z',
    auxiliary: eventAuxiliary._id,
    customer: customerAuxiliary._id,
    createdAt: '2019-01-16T14:30:19.543Z',
    subscription: customerAuxiliary.subscriptions[0]._id,
  },
  {
    _id: new ObjectID(),
    sector: sector._id,
    type: 'intervention',
    status: 'contract_with_company',
    startDate: '2019-01-16T09:30:19.543Z',
    endDate: '2019-01-16T11:30:21.653Z',
    auxiliary: eventAuxiliary._id,
    customer: customerAuxiliary._id,
    createdAt: '2019-01-15T11:33:14.343Z',
    subscription: customerAuxiliary.subscriptions[0]._id,
    isBilled: true,
    bills: {
      thirdPartyPayer: thirdPartyPayer._id,
      inclTaxesCustomer: 20,
      exclTaxesCustomer: 15,
      inclTaxesTpp: 10,
      exclTaxesTpp: 5,
      fundingId: new ObjectID(),
      nature: 'hourly',
      careHours: 2,
    },
  },
  {
    _id: new ObjectID(),
    sector: sector._id,
    type: 'intervention',
    status: 'contract_with_company',
    startDate: '2019-01-17T14:30:19.543Z',
    endDate: '2019-01-17T16:30:19.543Z',
    auxiliary: eventAuxiliary._id,
    customer: customerAuxiliary._id,
    createdAt: '2019-01-16T14:30:19.543Z',
    subscription: customerAuxiliary.subscriptions[0]._id,
    isBilled: true,
    bills: {
      inclTaxesCustomer: 20,
      exclTaxesCustomer: 15,
    },
  },
  {
    _id: new ObjectID(),
    sector: sector._id,
    type: 'absence',
    startDate: '2019-07-19T14:00:18.653Z',
    endDate: '2019-07-19T17:00:18.653Z',
    auxiliary: eventAuxiliary._id,
    createdAt: '2019-07-11T08:38:18.653Z',
  },
  {
    _id: new ObjectID(),
    sector: sector._id,
    type: 'intervention',
    status: 'contract_with_company',
    startDate: '2019-10-17T14:30:19.543Z',
    endDate: '2019-10-17T16:30:19.543Z',
    auxiliary: eventAuxiliary._id,
    customer: customerAuxiliary._id,
    createdAt: '2019-01-16T14:30:19.543Z',
    subscription: customerAuxiliary.subscriptions[0]._id,
    isBilled: false,
    bills: {
      inclTaxesCustomer: 20,
      exclTaxesCustomer: 15,
    },
  },
  {
    _id: new ObjectID(),
    sector: sector._id,
    type: 'intervention',
    status: 'contract_with_company',
    startDate: '2019-10-15T14:30:19.543Z',
    endDate: '2019-10-15T16:30:19.543Z',
    auxiliary: eventAuxiliary._id,
    customer: customerAuxiliary._id,
    createdAt: '2019-01-16T14:30:19.543Z',
    subscription: customerAuxiliary.subscriptions[0]._id,
    isBilled: false,
    bills: {
      inclTaxesCustomer: 20,
      exclTaxesCustomer: 15,
    },
  },
  {
    _id: repetitionParentId,
    sector: sector._id,
    type: 'intervention',
    status: 'contract_with_company',
    startDate: '2019-10-16T14:30:19.543Z',
    endDate: '2019-10-16T16:30:19.543Z',
    auxiliary: eventAuxiliary._id,
    customer: customerAuxiliary._id,
    repetition: { frequency: EVERY_WEEK, parentId: repetitionParentId },
    createdAt: '2019-01-16T14:30:19.543Z',
    subscription: customerAuxiliary.subscriptions[0]._id,
    isBilled: false,
    bills: {
      inclTaxesCustomer: 20,
      exclTaxesCustomer: 15,
    },
  },
];

const populateDB = async () => {
  await Event.deleteMany({});
  await User.deleteMany({});
  await Customer.deleteMany({});
  await ThirdPartyPayer.deleteMany({});
  await Contract.deleteMany({});
  await Service.deleteMany({});
  await EventHistory.deleteMany({});
  await Sector.deleteMany({});
  await Repetition.deleteMany({});

  await populateDBForAuthentication();
  await Event.insertMany(eventsList);
  await Contract.insertMany(contracts);
  await Repetition.insertMany(repetitions);
  await (new Sector(sector)).save();
  await (new User(eventAuxiliary)).save();
  await (new User(helpersCustomer)).save();
  await (new Customer(customerAuxiliary)).save();
  await (new ThirdPartyPayer(thirdPartyPayer)).save();
  await (new Service(service)).save();
};

const getUserToken = async (userCredentials) => {
  const response = await app.inject({
    method: 'POST',
    url: '/users/authenticate',
    payload: userCredentials,
  });

  return response.result.data.token;
};

module.exports = {
  eventsList,
  populateDB,
  eventAuxiliary,
  customerAuxiliary,
  sector,
  thirdPartyPayer,
  helpersCustomer,
  getUserToken,
};
