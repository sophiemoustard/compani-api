const { ObjectID } = require('mongodb');
const uuidv4 = require('uuid/v4');
const Event = require('../../../models/Event');
const User = require('../../../models/User');
const Customer = require('../../../models/Customer');
const ThirdPartyPayer = require('../../../models/ThirdPartyPayer');
const Contract = require('../../../models/Contract');
const Service = require('../../../models/Service');
const EventHistory = require('../../../models/EventHistory');
const Sector = require('../../../models/Sector');
const Company = require('../../../models/Company');
const { rolesList, populateDBForAuthentification } = require('./authentificationSeed');
const app = require('../../../server');

const auxiliaryId = new ObjectID();

const contract = {
  _id: new ObjectID('c435f90089caff4ddc4bbd68'),
  status: 'contract_with_company',
  user: auxiliaryId,
  startDate: '2010-09-03T00:00:00',
  versions: [{ startDate: '2010-09-03T00:00:00' }],
};

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

const sector = {
  _id: new ObjectID(),
  name: 'Paris',
  company: company._id,
};

const eventAuxiliary = {
  _id: auxiliaryId,
  identity: { firstname: 'Thibaut', lastname: 'Pinot' },
  local: { email: 't@p.com', password: 'tourdefrance' },
  administrative: { driveFolder: { driveId: '1234567890' } },
  refreshToken: uuidv4(),
  role: rolesList[1]._id,
  contracts: [contract._id],
  sector: sector._id,
};

const thirdPartyPayer = {
  _id: new ObjectID('62400565f8fd3555379720c9'),
};

const service = {
  _id: new ObjectID('5d3b239ce9e4352ef86e773b'),
  versions: [
    { _id: new ObjectID() },
  ],
};


const customerAuxiliary = {
  _id: new ObjectID('b0e491d37f0094ba49499562'),
  identity: { firstname: 'Romain', lastname: 'Bardet' },
  subscriptions: [
    { _id: new ObjectID('8b4c4f60d11f95df92d63859'), startDate: '2019-09-03T00:00:00', service: service._id },
  ],
};

const helpersCustomer = {
  _id: new ObjectID(),
  identity: { firstname: 'Nicolas', lastname: 'Flammel' },
  local: { email: 'tt@tt.com', password: 'mdpdeouf' },
  refreshToken: uuidv4(),
  customers: [customerAuxiliary._id],
  role: rolesList[4]._id,
};

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
  await Company.deleteMany({});

  await populateDBForAuthentification();
  await Event.insertMany(eventsList);
  await (new Company(company)).save();
  await (new Sector(sector)).save();
  await (new User(eventAuxiliary)).save();
  await (new User(helpersCustomer)).save();
  await (new Customer(customerAuxiliary)).save();
  await (new ThirdPartyPayer(thirdPartyPayer)).save();
  await (new Contract(contract)).save();
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
