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
const CreditNote = require('../../../src/models/CreditNote');
const DistanceMatrix = require('../../../src/models/DistanceMatrix');
const Helper = require('../../../src/models/Helper');
const { authCompany, otherCompany } = require('../../seed/authCompaniesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');
const app = require('../../../server');
const {
  EVERY_WEEK,
  NEVER,
  DAILY,
  PAID_LEAVE,
  INTERNAL_HOUR,
  ABSENCE,
  INTERVENTION,
  WEBAPP,
  PARENTAL_LEAVE,
  INVOICED_AND_NOT_PAID,
  AUXILIARY_INITIATIVE,
} = require('../../../src/helpers/constants');
const UserCompany = require('../../../src/models/UserCompany');
const { auxiliaryRoleId, clientAdminRoleId, helperRoleId } = require('../../seed/authRolesSeed');

const auxiliariesIds = [new ObjectID(), new ObjectID(), new ObjectID(), new ObjectID(), new ObjectID()];

const contracts = [
  {
    _id: new ObjectID(),
    serialNumber: 'sdfklasdkljfjsldfjksdss',
    user: auxiliariesIds[0],
    startDate: '2010-09-03T00:00:00',
    company: authCompany._id,
    versions: [{ startDate: '2010-09-03T00:00:00', grossHourlyRate: 10.43, weeklyHours: 12 }],
  },
  {
    _id: new ObjectID(),
    serialNumber: 'dskfajdksjf',
    user: auxiliariesIds[1],
    company: authCompany._id,
    startDate: '2010-09-03T00:00:00',
    versions: [{ startDate: '2010-09-03T00:00:00', grossHourlyRate: 10.43, weeklyHours: 12 }],
  },
  {
    _id: new ObjectID(),
    serialNumber: 'dskfajdksjfkjhg',
    user: auxiliariesIds[2],
    company: authCompany._id,
    startDate: '2010-09-03T00:00:00',
    versions: [{ startDate: '2010-09-03T00:00:00', grossHourlyRate: 10.43, weeklyHours: 12 }],
  },
  {
    _id: new ObjectID(),
    serialNumber: 'dskfajdksjwefkjhg',
    user: auxiliariesIds[3],
    company: authCompany._id,
    startDate: '2010-09-03T00:00:00',
    versions: [{ startDate: '2010-09-03T00:00:00', grossHourlyRate: 10.43, weeklyHours: 12 }],
  },
  {
    _id: new ObjectID(),
    serialNumber: 'skuskuksuksuksu',
    user: auxiliariesIds[4],
    company: authCompany._id,
    startDate: '2010-09-03T00:00:00',
    versions: [{ startDate: '2010-09-03T00:00:00', grossHourlyRate: 10.43, weeklyHours: 12 }],
  },
];

const sectors = [
  { _id: new ObjectID(), name: 'Paris', company: authCompany._id },
  { _id: new ObjectID(), name: '', company: authCompany._id },
  { _id: new ObjectID(), name: '', company: otherCompany._id },
];

const auxiliaries = [
  {
    _id: auxiliariesIds[0],
    identity: { firstname: 'Thibaut', lastname: 'Pinot' },
    local: { email: 't@p.com', password: '123456!eR' },
    administrative: { driveFolder: { driveId: '1234567890' }, transportInvoice: { transportType: 'public' } },
    refreshToken: uuidv4(),
    role: { client: auxiliaryRoleId },
    contracts: [contracts[0]._id],
    origin: WEBAPP,
  },
  {
    _id: auxiliariesIds[1],
    identity: { firstname: 'Marie', lastname: 'Pinot' },
    local: { email: 'm@p.com', password: '123456!eR' },
    administrative: { driveFolder: { driveId: '1234567890123456' }, transportInvoice: { transportType: 'public' } },
    refreshToken: uuidv4(),
    role: { client: auxiliaryRoleId },
    contracts: [contracts[1]._id],
    origin: WEBAPP,
  },
  {
    _id: auxiliariesIds[2],
    identity: { firstname: 'Philippe', lastname: 'Pinot' },
    local: { email: 'p@p.com', password: '123456!eR' },
    administrative: { driveFolder: { driveId: '1234567890123456' }, transportInvoice: { transportType: 'public' } },
    refreshToken: uuidv4(),
    role: { client: auxiliaryRoleId },
    contracts: [contracts[2]._id],
    origin: WEBAPP,
  },
  {
    _id: auxiliariesIds[3],
    identity: { firstname: 'Qertyui', lastname: 'Pinot' },
    local: { email: 'qwerty@p.com', password: '123456!eR' },
    administrative: { driveFolder: { driveId: '1234567890123456' }, transportInvoice: { transportType: 'public' } },
    refreshToken: uuidv4(),
    role: { client: auxiliaryRoleId },
    contracts: [contracts[2]._id],
    origin: WEBAPP,
  },
  {
    _id: auxiliariesIds[4],
    identity: { firstname: 'Noir', lastname: 'Pinot' },
    local: { email: 'sku@p.com', password: '123456!eR' },
    administrative: { driveFolder: { driveId: '1234567890123456' }, transportInvoice: { transportType: 'public' } },
    refreshToken: uuidv4(),
    role: { client: auxiliaryRoleId },
    contracts: [contracts[4]._id],
    origin: WEBAPP,
  },
];

const sectorHistories = [
  { auxiliary: auxiliariesIds[0], sector: sectors[0]._id, company: authCompany._id, startDate: '2018-12-10T09:00:00' },
  { auxiliary: auxiliaries[1]._id, sector: sectors[1]._id, company: authCompany._id, startDate: '2018-12-10T09:00:00' },
  { auxiliary: auxiliaries[2]._id, sector: sectors[1]._id, company: authCompany._id, startDate: '2018-12-10T09:00:00' },
  { auxiliary: auxiliaries[3]._id, sector: sectors[2]._id, company: authCompany._id, startDate: '2018-12-10T09:00:00' },
  { auxiliary: auxiliaries[4]._id, sector: sectors[0]._id, company: authCompany._id, startDate: '2018-12-10T09:00:00' },
];

const auxiliaryFromOtherCompany = {
  _id: new ObjectID(),
  identity: { firstname: 'Jean', lastname: 'Martin' },
  local: { email: 'j@m.com', password: '123456!eR' },
  administrative: { driveFolder: { driveId: '1234567890' } },
  refreshToken: uuidv4(),
  role: { client: clientAdminRoleId },
  origin: WEBAPP,
};

const sectorHistoryFromOtherCompany = {
  auxiliary: auxiliariesIds[0],
  sector: sectors[2]._id,
  company: otherCompany._id,
  startDate: '2018-12-10',
};

const thirdPartyPayer = {
  _id: new ObjectID(),
  name: 'Tyty',
  company: authCompany._id,
  isApa: true,
  billingMode: 'direct',
};

const thirdPartyPayerFromOtherCompany = {
  _id: new ObjectID(),
  company: otherCompany._id,
  isApa: true,
  billingMode: 'direct',
  name: 'Tyty',
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

const customerAuxiliaries = [
  {
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
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    identity: { firstname: 'Pierre', lastname: 'Rolland' },
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
      phone: '0612345671',
    },
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    identity: { firstname: 'Pierre', lastname: 'Jean' },
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
      phone: '0612345671',
    },
    stoppedAt: '2021-01-16 17:58:15.519',
    stopReason: 'quality',
    archivedAt: '2021-09-16 17:58:15.519',
  },
];

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
  customers: [customerAuxiliaries[0]._id],
  role: { client: helperRoleId },
  origin: WEBAPP,
};

const userCompanies = [
  { _id: new ObjectID(), user: auxiliariesIds[0], company: authCompany._id },
  { _id: new ObjectID(), user: auxiliariesIds[1], company: authCompany._id },
  { _id: new ObjectID(), user: auxiliariesIds[2], company: authCompany._id },
  { _id: new ObjectID(), user: auxiliariesIds[3], company: authCompany._id },
  { _id: new ObjectID(), user: auxiliariesIds[4], company: authCompany._id },
  { _id: new ObjectID(), user: auxiliaryFromOtherCompany._id, company: otherCompany._id },
  { _id: new ObjectID(), user: helpersCustomer._id, company: authCompany._id },
];

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
    type: INTERNAL_HOUR,
    repetition: { frequency: NEVER },
    startDate: '2019-01-17T10:30:18.653Z',
    endDate: '2019-01-17T12:00:18.653Z',
    auxiliary: auxiliaries[0]._id,
    customer: customerAuxiliaries[0]._id,
    createdAt: '2019-01-05T15:24:18.653Z',
    internalHour: new ObjectID(),
    address: {
      fullAddress: '4 rue du test 92160 Antony',
      street: '4 rue du test',
      zipCode: '92160',
      city: 'Antony',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  { // 1
    _id: new ObjectID(),
    company: authCompany._id,
    repetition: { frequency: NEVER },
    type: ABSENCE,
    absence: PAID_LEAVE,
    absenceNature: DAILY,
    startDate: '2019-01-19T14:00:18.653Z',
    endDate: '2019-01-19T17:00:18.653Z',
    auxiliary: auxiliaries[0]._id,
    createdAt: '2019-01-11T08:38:18.653Z',
  },
  { // 2
    _id: new ObjectID(),
    company: authCompany._id,
    type: INTERVENTION,
    repetition: { frequency: NEVER },
    startDate: '2019-01-16T09:30:19.543Z',
    endDate: '2019-01-16T11:30:21.653Z',
    auxiliary: auxiliaries[0]._id,
    customer: customerAuxiliaries[0]._id,
    createdAt: '2019-01-15T11:33:14.343Z',
    subscription: customerAuxiliaries[0].subscriptions[0]._id,
    address: {
      fullAddress: '4 rue du test 92160 Antony',
      street: '4 rue du test',
      zipCode: '92160',
      city: 'Antony',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  { // 3
    _id: new ObjectID(),
    company: authCompany._id,
    type: INTERVENTION,
    repetition: { frequency: NEVER },
    startDate: '2019-01-17T14:30:19.543Z',
    endDate: '2019-01-17T16:30:19.543Z',
    auxiliary: auxiliaries[0]._id,
    customer: customerAuxiliaries[0]._id,
    createdAt: '2019-01-16T14:30:19.543Z',
    subscription: customerAuxiliaries[0].subscriptions[0]._id,
    address: {
      fullAddress: '4 rue du test 92160 Antony',
      street: '4 rue du test',
      zipCode: '92160',
      city: 'Antony',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  { // 4
    _id: new ObjectID(),
    company: authCompany._id,
    type: INTERVENTION,
    startDate: '2019-01-16T09:30:19.543Z',
    endDate: '2019-01-16T11:30:21.653Z',
    auxiliary: auxiliaries[0]._id,
    customer: customerAuxiliaries[0]._id,
    createdAt: '2019-01-15T11:33:14.343Z',
    subscription: customerAuxiliaries[0].subscriptions[0]._id,
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
  { // 5
    _id: new ObjectID(),
    company: authCompany._id,
    type: INTERVENTION,
    repetition: { frequency: NEVER },
    startDate: '2019-01-17T16:30:19.543Z',
    endDate: '2019-01-17T18:30:19.543Z',
    auxiliary: auxiliaries[0]._id,
    customer: customerAuxiliaries[0]._id,
    createdAt: '2019-01-16T14:30:19.543Z',
    subscription: customerAuxiliaries[0].subscriptions[0]._id,
    isBilled: true,
    address: {
      fullAddress: '4 rue du test 92160 Antony',
      street: '4 rue du test',
      zipCode: '92160',
      city: 'Antony',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
    bills: { inclTaxesCustomer: 20, exclTaxesCustomer: 15 },
  },
  { // 6
    _id: new ObjectID(),
    company: authCompany._id,
    type: ABSENCE,
    absence: PAID_LEAVE,
    absenceNature: DAILY,
    startDate: '2019-07-19T14:00:18.653Z',
    endDate: '2019-07-19T17:00:18.653Z',
    repetition: { frequency: NEVER },
    auxiliary: auxiliaries[0]._id,
    createdAt: '2019-07-11T08:38:18.653Z',
  },
  { // 7
    _id: new ObjectID(),
    company: authCompany._id,
    type: INTERVENTION,
    startDate: '2019-10-17T14:30:19.543Z',
    endDate: '2019-10-17T16:30:19.543Z',
    auxiliary: auxiliaries[0]._id,
    repetition: { frequency: NEVER },
    customer: customerAuxiliaries[0]._id,
    createdAt: '2019-01-16T14:30:19.543Z',
    subscription: customerAuxiliaries[0].subscriptions[0]._id,
    isBilled: false,
    bills: { inclTaxesCustomer: 20, exclTaxesCustomer: 15 },
    address: {
      fullAddress: '4 rue du test 92160 Antony',
      street: '4 rue du test',
      zipCode: '92160',
      city: 'Antony',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  { // 8
    _id: new ObjectID(),
    company: authCompany._id,
    type: INTERVENTION,
    startDate: '2019-10-15T14:30:19.543Z',
    endDate: '2019-10-15T16:30:19.543Z',
    auxiliary: auxiliaries[0]._id,
    repetition: { frequency: NEVER },
    customer: customerAuxiliaries[0]._id,
    createdAt: '2019-01-16T14:30:19.543Z',
    subscription: customerAuxiliaries[0].subscriptions[0]._id,
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
  { // 9
    _id: repetitionParentId,
    company: authCompany._id,
    type: INTERVENTION,
    startDate: '2019-10-16T14:30:19.543Z',
    endDate: '2019-10-16T16:30:19.543Z',
    auxiliary: auxiliaries[0]._id,
    customer: customerAuxiliaries[0]._id,
    repetition: { frequency: EVERY_WEEK, parentId: repetitionParentId },
    createdAt: '2019-01-16T14:30:19.543Z',
    subscription: customerAuxiliaries[0].subscriptions[0]._id,
    isBilled: false,
    bills: { inclTaxesCustomer: 20, exclTaxesCustomer: 15 },
    address: {
      fullAddress: '4 rue du test 92160 Antony',
      street: '4 rue du test',
      zipCode: '92160',
      city: 'Antony',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  { // 10
    _id: new ObjectID(),
    company: authCompany._id,
    auxiliary: auxiliaries[0]._id,
    type: INTERVENTION,
    startDate: '2020-01-16T14:30:19.543Z',
    endDate: '2020-01-16T16:30:19.543Z',
    customer: customerAuxiliaries[0]._id,
    repetition: { frequency: NEVER },
    createdAt: '2019-01-16T14:30:19.543Z',
    subscription: customerAuxiliaries[0].subscriptions[0]._id,
    isBilled: false,
    bills: { inclTaxesCustomer: 20, exclTaxesCustomer: 15 },
    address: {
      fullAddress: '42 Rue de la Procession 75015 Paris',
      street: '42 Rue de la Procession',
      zipCode: '75015',
      city: 'Paris',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  { // 11
    _id: new ObjectID(),
    company: authCompany._id,
    auxiliary: auxiliaries[0]._id,
    type: INTERNAL_HOUR,
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
  { // 12
    _id: new ObjectID(),
    company: authCompany._id,
    auxiliary: auxiliaries[1]._id,
    type: INTERVENTION,
    startDate: '2020-01-18T15:30:19.543Z',
    endDate: '2020-01-18T16:30:19.543Z',
    customer: customerAuxiliaries[0]._id,
    repetition: { frequency: NEVER },
    createdAt: '2019-01-16T14:30:19.543Z',
    subscription: customerAuxiliaries[0].subscriptions[0]._id,
    isBilled: false,
    bills: { inclTaxesCustomer: 20, exclTaxesCustomer: 15 },
    address: {
      fullAddress: '105 BOULEVARD MURAT 75016 PARIS',
      street: '105 BOULEVARD MURAT',
      zipCode: '75016',
      city: 'Paris',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  { // 13
    _id: new ObjectID(),
    company: authCompany._id,
    auxiliary: auxiliaries[1]._id,
    type: INTERNAL_HOUR,
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
  { // 14
    _id: new ObjectID(),
    company: authCompany._id,
    sector: sectors[0]._id,
    type: INTERVENTION,
    startDate: '2020-01-12T15:30:19.543Z',
    endDate: '2020-01-12T16:30:19.543Z',
    customer: customerAuxiliaries[0]._id,
    repetition: { frequency: EVERY_WEEK, parentId: new ObjectID() },
    createdAt: '2019-01-16T14:30:19.543Z',
    subscription: customerAuxiliaries[0].subscriptions[0]._id,
    isBilled: false,
    bills: { inclTaxesCustomer: 20, exclTaxesCustomer: 15 },
    address: {
      fullAddress: '105 BOULEVARD MURAT 75016 PARIS',
      street: '105 BOULEVARD MURAT',
      zipCode: '75016',
      city: 'Paris',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  { // 15
    _id: new ObjectID(),
    company: authCompany._id,
    sector: sectors[0]._id,
    type: INTERVENTION,
    startDate: '2020-01-20T09:30:19.543Z',
    endDate: '2020-01-20T13:30:19.543Z',
    customer: customerAuxiliaries[0]._id,
    repetition: { frequency: NEVER },
    createdAt: '2019-01-16T14:30:19.543Z',
    subscription: customerAuxiliaries[0].subscriptions[0]._id,
    isBilled: false,
    bills: { inclTaxesCustomer: 20, exclTaxesCustomer: 15 },
    address: {
      fullAddress: '105 BOULEVARD MURAT 75016 PARIS',
      street: '105 BOULEVARD MURAT',
      zipCode: '75016',
      city: 'Paris',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  { // 16
    _id: new ObjectID(),
    company: authCompany._id,
    sector: sectors[1]._id,
    type: INTERVENTION,
    startDate: '2020-01-02T10:00:19.543Z',
    endDate: '2020-01-02T11:30:19.543Z',
    customer: customerAuxiliaries[0]._id,
    repetition: { frequency: NEVER },
    createdAt: '2019-01-16T14:30:19.543Z',
    subscription: customerAuxiliaries[0].subscriptions[0]._id,
    isBilled: false,
    bills: { inclTaxesCustomer: 20, exclTaxesCustomer: 15 },
    address: {
      fullAddress: '105 BOULEVARD MURAT 75016 PARIS',
      street: '105 BOULEVARD MURAT',
      zipCode: '75016',
      city: 'Paris',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  { // 17
    _id: new ObjectID(),
    company: authCompany._id,
    sector: sectors[1]._id,
    type: INTERVENTION,
    startDate: '2019-12-30T10:00:19.543Z',
    endDate: '2019-12-30T11:30:19.543Z',
    customer: customerAuxiliaries[0]._id,
    repetition: { frequency: NEVER },
    createdAt: '2019-01-16T14:30:19.543Z',
    subscription: customerAuxiliaries[0].subscriptions[0]._id,
    isBilled: false,
    bills: { inclTaxesCustomer: 20, exclTaxesCustomer: 15 },
    address: {
      fullAddress: '105 BOULEVARD MURAT 75016 PARIS',
      street: '105 BOULEVARD MURAT',
      zipCode: '75016',
      city: 'Paris',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  { // 18
    _id: new ObjectID(),
    company: authCompany._id,
    sector: sectors[0]._id,
    type: INTERVENTION,
    startDate: '2019-10-23T14:30:19.543Z',
    endDate: '2019-10-23T16:30:19.543Z',
    auxiliary: auxiliaries[0]._id,
    customer: customerAuxiliaries[0]._id,
    repetition: { frequency: EVERY_WEEK, parentId: repetitionParentId },
    createdAt: '2019-01-16T14:30:19.543Z',
    subscription: customerAuxiliaries[0].subscriptions[0]._id,
    isBilled: false,
    bills: { inclTaxesCustomer: 20, exclTaxesCustomer: 15 },
    address: {
      fullAddress: '4 rue du test 92160 Antony',
      street: '4 rue du test',
      zipCode: '92160',
      city: 'Antony',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  { // 19
    _id: new ObjectID(),
    company: authCompany._id,
    sector: sectors[0]._id,
    type: INTERVENTION,
    startDate: '2020-10-23T14:30:19.543Z',
    endDate: '2020-10-23T16:30:19.543Z',
    auxiliary: auxiliaries[0]._id,
    customer: customerAuxiliaries[0]._id,
    createdAt: '2019-01-16T14:30:19.543Z',
    subscription: customerAuxiliaries[0].subscriptions[2]._id,
    isBilled: false,
    address: {
      fullAddress: '4 rue du test 92160 Antony',
      street: '4 rue du test',
      zipCode: '92160',
      city: 'Antony',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  { // 20
    _id: new ObjectID(),
    company: authCompany._id,
    repetition: { frequency: NEVER },
    type: ABSENCE,
    absence: PARENTAL_LEAVE,
    absenceNature: DAILY,
    startDate: '2019-01-19T14:00:18.653Z',
    endDate: '2019-01-19T17:00:18.653Z',
    auxiliary: auxiliaries[0]._id,
    createdAt: '2019-01-11T08:38:18.653Z',
  },
  // Timestamp
  { // 21
    _id: new ObjectID(),
    company: authCompany._id,
    type: INTERVENTION,
    repetition: { frequency: EVERY_WEEK, parentId: new ObjectID() },
    startDate: (new Date()),
    endDate: (new Date()).setHours((new Date()).getHours() + 2),
    auxiliary: auxiliaries[0]._id,
    customer: customerAuxiliaries[1]._id,
    subscription: customerAuxiliaries[1].subscriptions[2]._id,
    createdAt: '2019-01-05T15:24:18.653Z',
    address: {
      fullAddress: '21 rue du test 92160 Antony',
      street: '21 rue du test',
      zipCode: '92160',
      city: 'Antony',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  { // 22
    _id: new ObjectID(),
    company: authCompany._id,
    repetition: { frequency: NEVER },
    type: ABSENCE,
    absence: PARENTAL_LEAVE,
    absenceNature: DAILY,
    startDate: (new Date()),
    endDate: (new Date()).setHours((new Date()).getHours() + 2),
    auxiliary: auxiliaries[1]._id,
    createdAt: '2019-01-11T08:38:18.653Z',
  },
  { // 23
    _id: new ObjectID(),
    company: authCompany._id,
    type: INTERVENTION,
    repetition: { frequency: EVERY_WEEK, parentId: new ObjectID() },
    startDate: (new Date()),
    endDate: (new Date()).setHours((new Date()).getHours() + 2),
    auxiliary: auxiliaries[3]._id,
    customer: customerAuxiliaries[1]._id,
    subscription: customerAuxiliaries[1].subscriptions[2]._id,
    createdAt: '2019-01-05T15:24:18.653Z',
    isCancelled: false,
    address: {
      fullAddress: '23 rue du test 92160 Antony',
      street: '23 rue du test',
      zipCode: '92160',
      city: 'Antony',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  { // 24
    _id: new ObjectID(),
    company: authCompany._id,
    type: INTERVENTION,
    repetition: { frequency: NEVER },
    startDate: (new Date()).setHours((new Date()).getHours() - 2),
    endDate: (new Date()),
    auxiliary: auxiliaries[3]._id,
    customer: customerAuxiliaries[1]._id,
    subscription: customerAuxiliaries[1].subscriptions[2]._id,
    createdAt: '2019-01-05T15:24:18.653Z',
    isCancelled: false,
    address: {
      fullAddress: '24 rue du test 92160 Antony',
      street: '24 rue du test',
      zipCode: '92160',
      city: 'Antony',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  { // 25
    _id: new ObjectID(),
    company: authCompany._id,
    type: INTERVENTION,
    repetition: { frequency: NEVER },
    startDate: (new Date()),
    endDate: (new Date()).setHours((new Date()).getHours() + 2),
    auxiliary: auxiliaries[2]._id,
    customer: customerAuxiliaries[1]._id,
    subscription: customerAuxiliaries[1].subscriptions[2]._id,
    createdAt: '2019-01-05T15:24:18.653Z',
    isCancelled: true,
    cancel: { condition: INVOICED_AND_NOT_PAID, reason: AUXILIARY_INITIATIVE },
    misc: 'blabla',
    address: {
      fullAddress: '25 rue du test 92160 Antony',
      street: '25 rue du test',
      zipCode: '92160',
      city: 'Antony',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  { // 26
    _id: new ObjectID(),
    company: authCompany._id,
    type: INTERVENTION,
    repetition: { frequency: NEVER },
    startDate: (new Date()),
    endDate: (new Date()).setHours((new Date()).getHours() + 2),
    auxiliary: auxiliaries[4]._id,
    customer: customerAuxiliaries[2]._id,
    subscription: customerAuxiliaries[2].subscriptions[2]._id,
    createdAt: '2019-01-05T15:24:18.653Z',
    isCancelled: false,
    misc: 'blabla',
    address: {
      fullAddress: '26 rue du test 92160 Antony',
      street: '26 rue du test',
      zipCode: '92160',
      city: 'Antony',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  { // 27
    _id: new ObjectID(),
    company: authCompany._id,
    sector: sectors[0]._id,
    type: INTERVENTION,
    startDate: '2019-10-23T14:30:19.543Z',
    endDate: '2019-10-23T16:30:19.543Z',
    auxiliary: auxiliaries[0]._id,
    customer: customerAuxiliaries[0]._id,
    repetition: { frequency: EVERY_WEEK },
    createdAt: '2019-01-16T14:30:19.543Z',
    subscription: customerAuxiliaries[0].subscriptions[0]._id,
    isBilled: false,
    bills: { inclTaxesCustomer: 20, exclTaxesCustomer: 15 },
    address: {
      fullAddress: '27 rue du test 92160 Antony',
      street: '27 rue du test',
      zipCode: '92160',
      city: 'Antony',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
];

const eventFromOtherCompany = {
  _id: new ObjectID(),
  company: otherCompany._id,
  type: INTERVENTION,
  startDate: '2019-10-23T14:30:19.543Z',
  endDate: '2019-10-23T16:30:19.543Z',
  auxiliary: auxiliaryFromOtherCompany._id,
  customer: customerFromOtherCompany._id,
  repetition: { frequency: EVERY_WEEK, parentId: repetitionParentId },
  createdAt: '2019-01-16T14:30:19.543Z',
  subscription: customerFromOtherCompany.subscriptions[0]._id,
  isBilled: false,
  bills: { inclTaxesCustomer: 20, exclTaxesCustomer: 15 },
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

const helpersList = [
  { customer: customerAuxiliaries[0]._id, user: helpersCustomer._id, company: authCompany._id, referent: true },
];

const timeStampingDate = new Date();
const eventHistoriesList = [
  {
    event: { eventId: eventsList[23]._id, startDate: timeStampingDate, type: INTERVENTION },
    company: eventsList[23].company,
    action: 'manual_time_stamping',
    manualTimeStampingReason: 'qrcode_missing',
    auxiliaries: [eventsList[23].auxiliary],
    update: { startHour: { from: eventsList[23].startDate, to: timeStampingDate } },
  },
  {
    event: { eventId: eventsList[24]._id, endDate: timeStampingDate, type: INTERVENTION },
    company: eventsList[24].company,
    action: 'manual_time_stamping',
    manualTimeStampingReason: 'qrcode_missing',
    auxiliaries: [eventsList[24].auxiliary],
    update: { endHour: { from: eventsList[24].endDate, to: timeStampingDate } },
  },
];

const creditNote = {
  _id: new ObjectID(),
  date: new Date('2020-01-10T06:00:00Z'),
  startDate: new Date('2020-01-01T06:00:00Z'),
  endDate: new Date('2020-01-15T06:00:00Z'),
  customer: customerAuxiliaries[0]._id,
  exclTaxesCustomer: 100,
  inclTaxesCustomer: 112,
  events: [{
    eventId: eventsList[0]._id,
    auxiliary: eventsList[0].auxiliary,
    startDate: eventsList[0].startDate,
    endDate: eventsList[0].endDate,
    serviceName: 'toto',
    bills: { inclTaxesCustomer: 10, exclTaxesCustomer: 8 },
  }],
  subscription: {
    _id: customerAuxiliaries[0].subscriptions[0]._id,
    service: { serviceId: services[0]._id, nature: 'fixed', name: 'toto' },
    vat: 5.5,
  },
  origin: 'compani',
  company: authCompany._id,
};

const creditNoteFromOtherCompany = {
  _id: new ObjectID(),
  date: new Date('2020-01-12T10:00:00Z'),
  startDate: new Date('2020-01-01T10:00:00Z'),
  endDate: new Date('2020-01-15T10:00:00Z'),
  customer: customerFromOtherCompany._id,
  exclTaxesCustomer: 100,
  inclTaxesCustomer: 112,
  events: [{
    eventId: eventFromOtherCompany._id,
    auxiliary: eventFromOtherCompany.auxiliary,
    startDate: eventFromOtherCompany.startDate,
    endDate: eventFromOtherCompany.endDate,
    serviceName: 'toto',
    bills: { inclTaxesCustomer: 10, exclTaxesCustomer: 8 },
  }],
  subscription: {
    _id: customerFromOtherCompany.subscriptions[0]._id,
    service: { serviceId: services[0]._id, nature: 'fixed', name: 'toto' },
    vat: 5.5,
  },
  origin: 'compani',
  company: otherCompany._id,
};

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Event.insertMany([...eventsList, eventFromOtherCompany]);
  await Repetition.insertMany(repetitions);
  await Sector.insertMany(sectors);
  await SectorHistory.insertMany([...sectorHistories, sectorHistoryFromOtherCompany]);
  await DistanceMatrix.insertMany(distanceMatrixList);
  await User.create([...auxiliaries, helpersCustomer, auxiliaryFromOtherCompany]);
  await Contract.insertMany(contracts);
  await Customer.insertMany([...customerAuxiliaries, customerFromOtherCompany]);
  await ThirdPartyPayer.insertMany([thirdPartyPayer, thirdPartyPayerFromOtherCompany]);
  await Service.insertMany([...services, serviceFromOtherCompany]);
  await InternalHour.insertMany([internalHour, internalHourFromOtherCompany]);
  await Helper.insertMany(helpersList);
  await EventHistory.insertMany(eventHistoriesList);
  await UserCompany.insertMany(userCompanies);
  await CreditNote.insertMany([creditNote, creditNoteFromOtherCompany]);
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
  customerAuxiliaries,
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
  eventHistoriesList,
  creditNote,
  creditNoteFromOtherCompany,
};
