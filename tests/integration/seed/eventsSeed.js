const { ObjectID } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const Event = require('../../../src/models/Event');
const User = require('../../../src/models/User');
const Customer = require('../../../src/models/Customer');
const Repetition = require('../../../src/models/Repetition');
const ThirdPartyPayer = require('../../../src/models/ThirdPartyPayer');
const Contract = require('../../../src/models/Contract');
const Service = require('../../../src/models/Service');
const EventHistory = require('../../../src/models/EventHistory');
const InternalHour = require('../../../src/models/InternalHour');
const Sector = require('../../../src/models/Sector');
const SectorHistory = require('../../../src/models/SectorHistory');
const DistanceMatrix = require('../../../src/models/DistanceMatrix');
const { rolesList, populateDBForAuthentication, authCompany, otherCompany } = require('./authenticationSeed');
const app = require('../../../server');
const { EVERY_WEEK, NEVER, DAILY, PAID_LEAVE } = require('../../../src/helpers/constants');

const auxiliaryId = new ObjectID();
const planningReferentId = new ObjectID();

const contracts = [{
  _id: new ObjectID(),
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
  user: planningReferentId,
  company: authCompany._id,
  startDate: '2010-09-03T00:00:00',
  versions: [{
    startDate: '2010-09-03T00:00:00',
    grossHourlyRate: 10.43,
    weeklyHours: 12,
  }],
}];

const sectors = [{
  _id: new ObjectID(),
  name: 'Paris',
  company: authCompany._id,
},
{
  _id: new ObjectID(),
  name: '',
  company: authCompany._id,
},
{
  _id: new ObjectID(),
  name: '',
  company: otherCompany._id,
}];

const auxiliaries = [
  {
    _id: auxiliaryId,
    identity: { firstname: 'Thibaut', lastname: 'Pinot' },
    local: { email: 't@p.com', password: '123456!eR' },
    administrative: { driveFolder: { driveId: '1234567890' }, transportInvoice: { transportType: 'public' } },
    refreshToken: uuidv4(),
    role: { client: rolesList.find(role => role.name === 'auxiliary')._id },
    contracts: [contracts[0]._id],
    company: authCompany._id,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Marie', lastname: 'Pinot' },
    local: { email: 'm@p.com', password: '123456!eR' },
    administrative: { driveFolder: { driveId: '1234567890123456' }, transportInvoice: { transportType: 'public' } },
    refreshToken: uuidv4(),
    role: { client: rolesList.find(role => role.name === 'auxiliary')._id },
    contracts: [contracts[0]._id],
    company: authCompany._id,
  },
];

const sectorHistories = [
  {
    auxiliary: auxiliaryId,
    sector: sectors[0]._id,
    company: authCompany._id,
    startDate: '2018-12-10',
  },
  {
    auxiliary: auxiliaries[1]._id,
    sector: sectors[1]._id,
    company: authCompany._id,
    startDate: '2018-12-10',
  },
];

const auxiliaryFromOtherCompany = {
  _id: new ObjectID(),
  identity: { firstname: 'Jean', lastname: 'Martin' },
  local: { email: 'j@m.com', password: '123456!eR' },
  administrative: { driveFolder: { driveId: '1234567890' } },
  refreshToken: uuidv4(),
  role: { client: rolesList[1]._id },
  company: otherCompany._id,
};

const sectorHistoryFromOtherCompany = {
  auxiliary: auxiliaryId,
  sector: sectors[2]._id,
  company: otherCompany._id,
  startDate: '2018-12-10',
};

const thirdPartyPayer = {
  _id: new ObjectID(),
  company: authCompany._id,
  isApa: true,
};

const thirdPartyPayerFromOtherCompany = {
  _id: new ObjectID(),
  company: otherCompany._id,
  isApa: true,
};

const services = [
  {
    _id: new ObjectID(),
    company: authCompany._id,
    nature: 'hourly',
    versions: [{
      defaultUnitAmount: 12,
      exemptFromCharges: false,
      name: 'Service 1',
      startDate: '2019-01-16 17:58:15.519',
      vat: 12,
    }],
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    nature: 'hourly',
    versions: [{
      defaultUnitAmount: 12,
      exemptFromCharges: false,
      name: 'Service 2',
      startDate: '2019-01-16 17:58:15.519',
      vat: 12,
    }],
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    nature: 'hourly',
    versions: [{
      defaultUnitAmount: 12,
      exemptFromCharges: false,
      name: 'Service archived',
      startDate: '2019-01-16 17:58:15.519',
      vat: 12,
    }],
    isArchived: true,
  },
];

const serviceFromOtherCompany = {
  _id: new ObjectID(),
  nature: 'hourly',
  company: otherCompany._id,
  versions: [{
    _id: new ObjectID(),
    defaultUnitAmount: 12,
    exemptFromCharges: false,
    name: 'Service 1',
    startDate: '2019-01-16 17:58:15.519',
    vat: 12,
  }],
};

const customerAuxiliary = {
  _id: new ObjectID(),
  company: authCompany._id,
  identity: { firstname: 'Romain', lastname: 'Bardet' },
  subscriptions: [
    { _id: new ObjectID(), startDate: '2019-09-03T00:00:00', service: services[0]._id },
    { _id: new ObjectID(), startDate: '2019-09-03T00:00:00', service: services[1]._id },
    { _id: new ObjectID(), startDate: '2019-09-03T00:00:00', service: services[2]._id },
  ],
  contact: {
    primaryAddress: {
      street: '37 rue de Ponthieu',
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
    phone: '0612345678',
  },
};

const customerFromOtherCompany = {
  _id: new ObjectID(),
  company: otherCompany._id,
  identity: { firstname: 'test', lastname: 'toto' },
  subscriptions: [
    { _id: new ObjectID(), startDate: '2019-09-03T00:00:00', service: services[0]._id },
  ],
  contact: {
    primaryAddress: {
      street: '37 rue de Ponthieu',
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
    phone: '0612345678',
  },
};

const helpersCustomer = {
  _id: new ObjectID(),
  identity: { firstname: 'Nicolas', lastname: 'Flammel' },
  local: { email: 'tt@tt.com', password: '123456!eR' },
  refreshToken: uuidv4(),
  customers: [customerAuxiliary._id],
  role: { client: rolesList[4]._id },
  company: authCompany._id,
};

const internalHour = { _id: new ObjectID(), name: 'test', company: authCompany._id };
const internalHourFromOtherCompany = { _id: new ObjectID(), name: 'Tutu', company: otherCompany._id };

const repetitionParentId = new ObjectID();
const repetitions = [{
  _id: new ObjectID(),
  parentId: repetitionParentId,
  repetition: { frequency: EVERY_WEEK },
  company: authCompany._id,
}];

const eventsList = [
  {
    _id: new ObjectID(),
    company: authCompany._id,
    type: 'internalHour',
    repetition: { frequency: NEVER },
    startDate: '2019-01-17T10:30:18.653Z',
    endDate: '2019-01-17T12:00:18.653Z',
    auxiliary: auxiliaries[0]._id,
    customer: customerAuxiliary._id,
    createdAt: '2019-01-05T15:24:18.653Z',
    internalHour: {
      _id: new ObjectID(),
      name: 'Formation',
    },
    address: {
      fullAddress: '4 rue du test 92160 Antony',
      street: '4 rue du test',
      zipCode: '92160',
      city: 'Antony',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    repetition: { frequency: NEVER },
    type: 'absence',
    absence: PAID_LEAVE,
    absenceNature: DAILY,
    startDate: '2019-01-19T14:00:18.653Z',
    endDate: '2019-01-19T17:00:18.653Z',
    auxiliary: auxiliaries[0]._id,
    createdAt: '2019-01-11T08:38:18.653Z',
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    type: 'intervention',
    repetition: { frequency: NEVER },
    startDate: '2019-01-16T09:30:19.543Z',
    endDate: '2019-01-16T11:30:21.653Z',
    auxiliary: auxiliaries[0]._id,
    customer: customerAuxiliary._id,
    createdAt: '2019-01-15T11:33:14.343Z',
    subscription: customerAuxiliary.subscriptions[0]._id,
    address: {
      fullAddress: '4 rue du test 92160 Antony',
      street: '4 rue du test',
      zipCode: '92160',
      city: 'Antony',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    type: 'intervention',
    repetition: { frequency: NEVER },
    startDate: '2019-01-17T14:30:19.543Z',
    endDate: '2019-01-17T16:30:19.543Z',
    auxiliary: auxiliaries[0]._id,
    customer: customerAuxiliary._id,
    createdAt: '2019-01-16T14:30:19.543Z',
    subscription: customerAuxiliary.subscriptions[0]._id,
    address: {
      fullAddress: '4 rue du test 92160 Antony',
      street: '4 rue du test',
      zipCode: '92160',
      city: 'Antony',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    type: 'intervention',
    startDate: '2019-01-16T09:30:19.543Z',
    endDate: '2019-01-16T11:30:21.653Z',
    auxiliary: auxiliaries[0]._id,
    customer: customerAuxiliary._id,
    createdAt: '2019-01-15T11:33:14.343Z',
    subscription: customerAuxiliary.subscriptions[0]._id,
    isBilled: true,
    repetition: { frequency: NEVER },
    address: {
      fullAddress: '4 rue du test 92160 Antony',
      street: '4 rue du test',
      zipCode: '92160',
      city: 'Antony',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
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
    company: authCompany._id,
    type: 'intervention',
    repetition: { frequency: NEVER },
    startDate: '2019-01-17T16:30:19.543Z',
    endDate: '2019-01-17T18:30:19.543Z',
    auxiliary: auxiliaries[0]._id,
    customer: customerAuxiliary._id,
    createdAt: '2019-01-16T14:30:19.543Z',
    subscription: customerAuxiliary.subscriptions[0]._id,
    isBilled: true,
    address: {
      fullAddress: '4 rue du test 92160 Antony',
      street: '4 rue du test',
      zipCode: '92160',
      city: 'Antony',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
    bills: {
      inclTaxesCustomer: 20,
      exclTaxesCustomer: 15,
    },
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    type: 'absence',
    absence: PAID_LEAVE,
    absenceNature: DAILY,
    startDate: '2019-07-19T14:00:18.653Z',
    endDate: '2019-07-19T17:00:18.653Z',
    repetition: { frequency: NEVER },
    auxiliary: auxiliaries[0]._id,
    createdAt: '2019-07-11T08:38:18.653Z',
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    type: 'intervention',
    startDate: '2019-10-17T14:30:19.543Z',
    endDate: '2019-10-17T16:30:19.543Z',
    auxiliary: auxiliaries[0]._id,
    repetition: { frequency: NEVER },
    customer: customerAuxiliary._id,
    createdAt: '2019-01-16T14:30:19.543Z',
    subscription: customerAuxiliary.subscriptions[0]._id,
    isBilled: false,
    bills: {
      inclTaxesCustomer: 20,
      exclTaxesCustomer: 15,
    },
    address: {
      fullAddress: '4 rue du test 92160 Antony',
      street: '4 rue du test',
      zipCode: '92160',
      city: 'Antony',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    type: 'intervention',
    startDate: '2019-10-15T14:30:19.543Z',
    endDate: '2019-10-15T16:30:19.543Z',
    auxiliary: auxiliaries[0]._id,
    repetition: { frequency: NEVER },
    customer: customerAuxiliary._id,
    createdAt: '2019-01-16T14:30:19.543Z',
    subscription: customerAuxiliary.subscriptions[0]._id,
    isBilled: false,
    bills: {
      inclTaxesCustomer: 20,
      exclTaxesCustomer: 15,
    },
    address: {
      fullAddress: '4 rue du test 92160 Antony',
      street: '4 rue du test',
      zipCode: '92160',
      city: 'Antony',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  {
    _id: repetitionParentId,
    company: authCompany._id,
    type: 'intervention',
    startDate: '2019-10-16T14:30:19.543Z',
    endDate: '2019-10-16T16:30:19.543Z',
    auxiliary: auxiliaries[0]._id,
    customer: customerAuxiliary._id,
    repetition: { frequency: EVERY_WEEK, parentId: repetitionParentId },
    createdAt: '2019-01-16T14:30:19.543Z',
    subscription: customerAuxiliary.subscriptions[0]._id,
    isBilled: false,
    bills: {
      inclTaxesCustomer: 20,
      exclTaxesCustomer: 15,
    },
    address: {
      fullAddress: '4 rue du test 92160 Antony',
      street: '4 rue du test',
      zipCode: '92160',
      city: 'Antony',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    auxiliary: auxiliaries[0]._id,
    type: 'intervention',
    startDate: '2020-01-16T14:30:19.543Z',
    endDate: '2020-01-16T16:30:19.543Z',
    customer: customerAuxiliary._id,
    repetition: { frequency: NEVER },
    createdAt: '2019-01-16T14:30:19.543Z',
    subscription: customerAuxiliary.subscriptions[0]._id,
    isBilled: false,
    bills: {
      inclTaxesCustomer: 20,
      exclTaxesCustomer: 15,
    },
    address: {
      fullAddress: '42 Rue de la Procession 75015 Paris',
      street: '42 Rue de la Procession',
      zipCode: '75015',
      city: 'Paris',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    auxiliary: auxiliaries[0]._id,
    type: 'internalHour',
    internalHour: internalHour._id,
    startDate: '2020-01-16T17:00:19.543Z',
    endDate: '2020-01-16T18:00:19.543Z',
    createdAt: '2019-01-16T14:30:19.543Z',
    address: {
      fullAddress: '37 Rue de Ponthieu 75008 Paris',
      street: '37 rue de Ponthieu',
      zipCode: '75008',
      city: 'Paris',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    auxiliary: auxiliaries[1]._id,
    type: 'intervention',
    startDate: '2020-01-18T15:30:19.543Z',
    endDate: '2020-01-18T16:30:19.543Z',
    customer: customerAuxiliary._id,
    repetition: { frequency: NEVER },
    createdAt: '2019-01-16T14:30:19.543Z',
    subscription: customerAuxiliary.subscriptions[0]._id,
    isBilled: false,
    bills: {
      inclTaxesCustomer: 20,
      exclTaxesCustomer: 15,
    },
    address: {
      fullAddress: '105 BOULEVARD MURAT 75016 PARIS',
      street: '105 BOULEVARD MURAT',
      zipCode: '75016',
      city: 'Paris',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    auxiliary: auxiliaries[1]._id,
    type: 'internalHour',
    internalHour: internalHour._id,
    startDate: '2020-01-18T17:00:19.543Z',
    endDate: '2020-01-18T20:00:19.543Z',
    createdAt: '2019-01-16T14:30:19.543Z',
    address: {
      fullAddress: '37 Rue de Ponthieu 75008 Paris',
      street: '37 rue de Ponthieu',
      zipCode: '75008',
      city: 'Paris',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    sector: sectors[0]._id,
    type: 'intervention',
    startDate: '2020-01-12T15:30:19.543Z',
    endDate: '2020-01-12T16:30:19.543Z',
    customer: customerAuxiliary._id,
    repetition: { frequency: NEVER },
    createdAt: '2019-01-16T14:30:19.543Z',
    subscription: customerAuxiliary.subscriptions[0]._id,
    isBilled: false,
    bills: {
      inclTaxesCustomer: 20,
      exclTaxesCustomer: 15,
    },
    address: {
      fullAddress: '105 BOULEVARD MURAT 75016 PARIS',
      street: '105 BOULEVARD MURAT',
      zipCode: '75016',
      city: 'Paris',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    sector: sectors[0]._id,
    type: 'intervention',
    startDate: '2020-01-20T09:30:19.543Z',
    endDate: '2020-01-20T13:30:19.543Z',
    customer: customerAuxiliary._id,
    repetition: { frequency: NEVER },
    createdAt: '2019-01-16T14:30:19.543Z',
    subscription: customerAuxiliary.subscriptions[0]._id,
    isBilled: false,
    bills: {
      inclTaxesCustomer: 20,
      exclTaxesCustomer: 15,
    },
    address: {
      fullAddress: '105 BOULEVARD MURAT 75016 PARIS',
      street: '105 BOULEVARD MURAT',
      zipCode: '75016',
      city: 'Paris',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    sector: sectors[1]._id,
    type: 'intervention',
    startDate: '2020-01-02T10:00:19.543Z',
    endDate: '2020-01-02T11:30:19.543Z',
    customer: customerAuxiliary._id,
    repetition: { frequency: NEVER },
    createdAt: '2019-01-16T14:30:19.543Z',
    subscription: customerAuxiliary.subscriptions[0]._id,
    isBilled: false,
    bills: {
      inclTaxesCustomer: 20,
      exclTaxesCustomer: 15,
    },
    address: {
      fullAddress: '105 BOULEVARD MURAT 75016 PARIS',
      street: '105 BOULEVARD MURAT',
      zipCode: '75016',
      city: 'Paris',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    sector: sectors[1]._id,
    type: 'intervention',
    startDate: '2019-12-30T10:00:19.543Z',
    endDate: '2019-12-30T11:30:19.543Z',
    customer: customerAuxiliary._id,
    repetition: { frequency: NEVER },
    createdAt: '2019-01-16T14:30:19.543Z',
    subscription: customerAuxiliary.subscriptions[0]._id,
    isBilled: false,
    bills: {
      inclTaxesCustomer: 20,
      exclTaxesCustomer: 15,
    },
    address: {
      fullAddress: '105 BOULEVARD MURAT 75016 PARIS',
      street: '105 BOULEVARD MURAT',
      zipCode: '75016',
      city: 'Paris',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    sector: sectors[0]._id,
    type: 'intervention',
    startDate: '2019-10-23T14:30:19.543Z',
    endDate: '2019-10-23T16:30:19.543Z',
    auxiliary: auxiliaries[0]._id,
    customer: customerAuxiliary._id,
    repetition: { frequency: EVERY_WEEK, parentId: repetitionParentId },
    createdAt: '2019-01-16T14:30:19.543Z',
    subscription: customerAuxiliary.subscriptions[0]._id,
    isBilled: false,
    bills: {
      inclTaxesCustomer: 20,
      exclTaxesCustomer: 15,
    },
    address: {
      fullAddress: '4 rue du test 92160 Antony',
      street: '4 rue du test',
      zipCode: '92160',
      city: 'Antony',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    sector: sectors[0]._id,
    type: 'intervention',
    startDate: '2020-10-23T14:30:19.543Z',
    endDate: '2020-10-23T16:30:19.543Z',
    auxiliary: auxiliaries[0]._id,
    customer: customerAuxiliary._id,
    createdAt: '2019-01-16T14:30:19.543Z',
    subscription: customerAuxiliary.subscriptions[2]._id,
    isBilled: false,
    address: {
      fullAddress: '4 rue du test 92160 Antony',
      street: '4 rue du test',
      zipCode: '92160',
      city: 'Antony',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
];

const eventFromOtherCompany = {
  _id: new ObjectID(),
  company: otherCompany._id,
  type: 'intervention',
  startDate: '2019-10-23T14:30:19.543Z',
  endDate: '2019-10-23T16:30:19.543Z',
  auxiliary: auxiliaryFromOtherCompany._id,
  customer: customerFromOtherCompany._id,
  repetition: { frequency: EVERY_WEEK, parentId: repetitionParentId },
  createdAt: '2019-01-16T14:30:19.543Z',
  subscription: customerFromOtherCompany.subscriptions[0]._id,
  isBilled: false,
  bills: {
    inclTaxesCustomer: 20,
    exclTaxesCustomer: 15,
  },
  address: {
    fullAddress: '4 rue du test 92160 Antony',
    street: '4 rue du test',
    zipCode: '92160',
    city: 'Antony',
    location: { type: 'Point', coordinates: [2.377133, 48.801389] },
  },
};

const distanceMatrixList = [
  {
    _id: new ObjectID(),
    company: authCompany._id,
    origins: '42 Rue de la Procession 75015 Paris',
    destinations: '37 Rue de Ponthieu 75008 Paris',
    mode: 'transit',
    distance: 5073,
    duration: 3600,
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    origins: '105 BOULEVARD MURAT 75016 PARIS',
    destinations: '37 Rue de Ponthieu 75008 Paris',
    mode: 'transit',
    distance: 13905,
    duration: 2700,
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
  await SectorHistory.deleteMany({});
  await Repetition.deleteMany({});
  await InternalHour.deleteMany({});
  await DistanceMatrix.deleteMany({});

  await populateDBForAuthentication();
  await Event.insertMany(eventsList);
  await (new Event(eventFromOtherCompany)).save();
  await Contract.insertMany(contracts);
  await Repetition.insertMany(repetitions);
  await Sector.insertMany(sectors);
  await SectorHistory.insertMany([...sectorHistories, sectorHistoryFromOtherCompany]);
  await DistanceMatrix.insertMany(distanceMatrixList);
  await (new User(auxiliaries[0])).save();
  await (new User(auxiliaries[1])).save();
  await (new User(helpersCustomer)).save();
  await (new User(auxiliaryFromOtherCompany)).save();
  await (new Customer(customerAuxiliary)).save();
  await (new Customer(customerFromOtherCompany)).save();
  await (new ThirdPartyPayer(thirdPartyPayer)).save();
  await (new ThirdPartyPayer(thirdPartyPayerFromOtherCompany)).save();
  await Service.insertMany(services);
  await (new Service(serviceFromOtherCompany)).save();
  await (new InternalHour(internalHour)).save();
  await (new InternalHour(internalHourFromOtherCompany)).save();
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
  auxiliaries,
  customerAuxiliary,
  sectors,
  thirdPartyPayer,
  helpersCustomer,
  getUserToken,
  internalHour,
  customerFromOtherCompany,
  auxiliaryFromOtherCompany,
  internalHourFromOtherCompany,
  serviceFromOtherCompany,
  thirdPartyPayerFromOtherCompany,
  eventFromOtherCompany,
};
