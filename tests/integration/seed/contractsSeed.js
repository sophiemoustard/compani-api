const { v4: uuidv4 } = require('uuid');
const { ObjectID } = require('mongodb');
const { DAILY, PAID_LEAVE, INTERNAL_HOUR, ABSENCE, INTERVENTION, WEBAPP } = require('../../../src/helpers/constants');
const Contract = require('../../../src/models/Contract');
const User = require('../../../src/models/User');
const Customer = require('../../../src/models/Customer');
const Sector = require('../../../src/models/Sector');
const SectorHistory = require('../../../src/models/SectorHistory');
const Event = require('../../../src/models/Event');
const Establishment = require('../../../src/models/Establishment');
const UserCompany = require('../../../src/models/UserCompany');
const { rolesList } = require('./authenticationSeed');
const { authCompany, otherCompany } = require('./authenticationSeed');
const { deleteNonAuthenticationSeeds } = require('./initializeDB');

const customer = {
  _id: new ObjectID(),
  company: authCompany._id,
  identity: { title: 'mr', firstname: 'Romain', lastname: 'Bardet' },
  contact: {
    primaryAddress: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
    phone: '0123456789',
  },
  subscriptions: [{
    _id: new ObjectID(),
    service: new ObjectID(),
    versions: [{
      unitTTCRate: 12,
      estimatedWeeklyVolume: 12,
      evenings: 2,
      sundays: 1,
      startDate: '2018-01-01T10:00:00.000+01:00',
    }],
  }],
  payment: { bankAccountOwner: 'David gaudu', iban: '', bic: '', mandates: [{ rum: 'R012345678903456789' }] },
  driveFolder: { driveId: '1234567890' },
};

const otherContractUser = {
  _id: new ObjectID(),
  identity: { firstname: 'OCCU', lastname: 'OCCU' },
  local: { email: 'other-company-contract-user@alenvi.io', password: '123456!eR' },
  refreshToken: uuidv4(),
  role: { client: rolesList[0]._id },
  contracts: [new ObjectID()],
  prefixNumber: 103,
  origin: WEBAPP,
};

const sector = { _id: new ObjectID(), company: authCompany._id };

const establishment = {
  _id: new ObjectID(),
  name: 'Tata',
  siret: '09876543210987',
  address: {
    street: '37, rue des acacias',
    fullAddress: '37, rue des acacias 69000 Lyon',
    zipCode: '69000',
    city: 'Lyon',
    location: { type: 'Point', coordinates: [4.824302, 3.50807] },
  },
  phone: '0446899034',
  workHealthService: 'MT01',
  urssafCode: '217',
  company: authCompany,
};

const contractUsers = [
  {
    _id: new ObjectID(),
    establishment: establishment._id,
    identity: {
      firstname: 'Test7',
      lastname: 'Test7',
      nationality: 'FR',
      socialSecurityNumber: '2987654334562',
      birthDate: '1999-09-08T00:00:00',
      birthCity: 'Paris',
      birthState: 75,
    },
    local: { email: 'test7@alenvi.io', password: '123456!eR' },
    refreshToken: uuidv4(),
    role: { client: rolesList.find(role => role.name === 'auxiliary')._id },
    contracts: [new ObjectID()],
    contact: {
      address: {
        fullAddress: '37 rue de ponthieu 75008 Paris',
        zipCode: '75008',
        city: 'Paris',
        street: '37 rue de Ponthieu',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
    },
    origin: WEBAPP,
  },
  {
    _id: new ObjectID(),
    identity: {
      firstname: 'ayolo',
      lastname: 'Toto',
      nationality: 'FR',
      socialSecurityNumber: '2987654334562',
      birthDate: '1999-09-08T00:00:00',
      birthCity: 'Paris',
      birthState: 75,
    },
    establishment: new ObjectID(),
    local: { email: 'tototest@alenvi.io', password: '123456!eR' },
    refreshToken: uuidv4(),
    role: { client: rolesList.find(role => role.name === 'auxiliary')._id },
    contracts: [new ObjectID()],
    contact: {
      address: {
        fullAddress: '37 rue de ponthieu 75008 Paris',
        zipCode: '75008',
        city: 'Paris',
        street: '37 rue de Ponthieu',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
    },
    origin: WEBAPP,
  },
  {
    _id: new ObjectID(),
    identity: {
      firstname: 'ok',
      lastname: 'Titi',
      nationality: 'FR',
      socialSecurityNumber: '2987654334562',
      birthDate: '1999-09-08T00:00:00',
      birthCity: 'Paris',
      birthState: 75,
    },
    establishment: new ObjectID(),
    local: { email: 'ok@alenvi.io', password: '123456!eR' },
    refreshToken: uuidv4(),
    role: { client: rolesList.find(role => role.name === 'auxiliary')._id },
    contact: {
      address: {
        fullAddress: '37 rue de ponthieu 75008 Paris',
        zipCode: '75008',
        city: 'Paris',
        street: '37 rue de Ponthieu',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
    },
    contracts: [new ObjectID()],
    origin: WEBAPP,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'contract', lastname: 'Titi' },
    local: { email: 'contract@alenvi.io', password: '123456!eR' },
    refreshToken: uuidv4(),
    role: { client: rolesList.find(role => role.name === 'auxiliary')._id },
    contracts: [new ObjectID()],
    sector: sector._id,
    origin: WEBAPP,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'contract', lastname: 'Uelle' },
    local: { email: 'dfghjkscs@alenvi.io', password: '123456!eR' },
    refreshToken: uuidv4(),
    role: { client: rolesList.find(role => role.name === 'auxiliary')._id },
    contracts: [new ObjectID()],
    sector: sector._id,
    origin: WEBAPP,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'contract', lastname: 'ant' },
    local: { email: 'iuytr@alenvi.io', password: '123456!eR' },
    refreshToken: uuidv4(),
    role: { client: rolesList.find(role => role.name === 'auxiliary')._id },
    contracts: [new ObjectID()],
    sector: sector._id,
    origin: WEBAPP,
  },
  {
    _id: new ObjectID(),
    identity: {
      firstname: 'contract',
      lastname: 'ion',
      nationality: 'FR',
      socialSecurityNumber: '2987654334562',
      birthDate: '1999-09-08T00:00:00',
      birthCity: 'Paris',
      birthState: 75,
    },
    contact: {
      address: {
        fullAddress: '37 rue de ponthieu 75008 Paris',
        zipCode: '75008',
        city: 'Paris',
        street: '37 rue de Ponthieu',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
    },
    local: { email: 'dfghjk@alenvi.io', password: '123456!eR' },
    refreshToken: uuidv4(),
    role: { client: rolesList.find(role => role.name === 'auxiliary')._id },
    contracts: [new ObjectID()],
    sector: sector._id,
    origin: WEBAPP,
    establishment: new ObjectID(),
  },
];

const sectorHistories = [
  { auxiliary: contractUsers[0]._id, sector: sector._id, company: authCompany._id },
  { auxiliary: contractUsers[1]._id, sector: sector._id, company: authCompany._id },
  {
    auxiliary: contractUsers[6]._id,
    sector: sector._id,
    company: authCompany._id,
    startDate: '2018-08-02T00:00:00',
    endDate: '2019-09-02T23:59:59',
  },
  {
    auxiliary: contractUsers[2]._id,
    sector: sector._id,
    company: authCompany._id,
    startDate: '2016-12-01T00:00:00',
    endDate: '2016-12-20T23:59:59',
  },
  {
    auxiliary: contractUsers[3]._id,
    sector: sector._id,
    company: authCompany._id,
    startDate: '2018-08-03T00:00:00',
    endDate: '2018-09-02T23:59:59',
  },
  {
    auxiliary: contractUsers[2]._id,
    sector: sector._id,
    company: authCompany._id,
    startDate: '2017-01-01T00:00:00',
  },
  {
    auxiliary: contractUsers[4]._id,
    sector: sector._id,
    company: authCompany._id,
    startDate: '2018-08-02T00:00:00',
  },
  {
    auxiliary: contractUsers[5]._id,
    sector: sector._id,
    company: authCompany._id,
    startDate: '2017-01-01T00:00:00',
  },
  { auxiliary: contractUsers[3]._id, sector: sector._id, company: authCompany._id, startDate: '2018-08-02T00:00:00' },
];

const otherContract = {
  serialNumber: 'wfjefajsdklvcmkdmck',
  user: otherContractUser._id,
  startDate: '2018-12-03T23:00:00.000Z',
  _id: otherContractUser.contracts[0],
  company: otherCompany._id,
  versions: [{ grossHourlyRate: 10.28, startDate: '2018-12-03T23:00:00.000Z', weeklyHours: 9, _id: new ObjectID() }],
};

const userFromOtherCompany = {
  _id: new ObjectID(),
  identity: { firstname: 'Test7', lastname: 'Test7' },
  local: { email: 'test@othercompany.io', password: '123456!eR' },
  refreshToken: uuidv4(),
  role: { client: rolesList[0]._id },
  contracts: [new ObjectID()],
  origin: WEBAPP,
};

const contractUserCompanies = [
  { _id: new ObjectID(), user: contractUsers[0]._id, company: authCompany._id },
  { _id: new ObjectID(), user: contractUsers[1]._id, company: authCompany._id },
  { _id: new ObjectID(), user: contractUsers[2]._id, company: authCompany._id },
  { _id: new ObjectID(), user: contractUsers[3]._id, company: authCompany._id },
  { _id: new ObjectID(), user: contractUsers[4]._id, company: authCompany._id },
  { _id: new ObjectID(), user: contractUsers[5]._id, company: authCompany._id },
  { _id: new ObjectID(), user: contractUsers[6]._id, company: authCompany._id },
  { _id: new ObjectID(), user: otherContractUser._id, company: otherCompany._id },
  { _id: new ObjectID(), user: userFromOtherCompany._id, company: otherCompany._id },
];

const contractsList = [
  {
    serialNumber: 'mnbvcxzaserfghjiu',
    user: contractUsers[0]._id,
    startDate: '2018-12-03T23:00:00.000Z',
    _id: contractUsers[0].contracts[0],
    company: authCompany._id,
    versions: [{ grossHourlyRate: 10.28, startDate: '2018-12-03T23:00:00.000Z', weeklyHours: 9, _id: new ObjectID() }],
  },
  {
    serialNumber: 'sdfgtresddbgr',
    user: contractUsers[1]._id,
    startDate: '2018-12-03T23:00:00.000Z',
    endDate: '2019-02-03T23:00:00.000Z',
    endNotificationDate: '2019-02-03T23:00:00.000Z',
    endReason: 'mutation',
    _id: contractUsers[1].contracts[0],
    company: authCompany._id,
    versions: [{ grossHourlyRate: 10.28, startDate: '2018-12-03T23:00:00.000Z', weeklyHours: 9, _id: new ObjectID() }],
  },
  {
    serialNumber: 'qwdfgbnhygfc',
    endDate: null,
    company: authCompany._id,
    user: contractUsers[2]._id,
    startDate: '2018-08-02T00:00:00',
    _id: contractUsers[2].contracts[0],
    versions: [{ grossHourlyRate: 10.12, startDate: '2018-08-02T00:00:00', weeklyHours: 15, _id: new ObjectID() }],
  },
  {
    serialNumber: 'cvfdjsbjknvkaskdj',
    user: contractUsers[4]._id,
    startDate: '2018-08-02T00:00:00',
    _id: contractUsers[4].contracts[0],
    company: authCompany._id,
    versions: [{
      endDate: '2018-09-02T23:59:59',
      grossHourlyRate: 10.12,
      startDate: '2018-08-02T00:00:00',
      weeklyHours: 15,
      _id: new ObjectID(),
    }],
  },
  {
    serialNumber: 'cacnxnkzlas',
    user: contractUsers[5]._id,
    startDate: '2017-08-02T00:00:00',
    _id: contractUsers[5].contracts[0],
    company: authCompany._id,
    versions: [{
      endDate: '2017-09-02T23:59:59',
      grossHourlyRate: 10.12,
      startDate: '2017-08-02T00:00:00',
      weeklyHours: 15,
      _id: new ObjectID(),
    }, {
      endDate: '2017-10-10T23:59:59',
      grossHourlyRate: 10.12,
      startDate: '2017-09-03T00:00:00',
      weeklyHours: 22,
      _id: new ObjectID(),
    }],
  },
  {
    serialNumber: 'sldfnasdlknfkds',
    user: contractUsers[3]._id,
    startDate: '2018-08-02T00:00:00',
    _id: contractUsers[3].contracts[0],
    company: authCompany._id,
    versions: [{ grossHourlyRate: 10.12, startDate: '2018-08-02T00:00:00', weeklyHours: 15, _id: new ObjectID() }],
  },
  {
    serialNumber: 'lkjhgfdcdsvbnjckasdf',
    user: contractUsers[6]._id,
    startDate: '2018-08-02T00:00:00',
    endDate: '2019-09-02T23:59:59',
    endNotificationDate: '2019-09-02T23:59:59',
    endReason: 'mutation',
    _id: contractUsers[6].contracts[0],
    company: authCompany._id,
    versions: [{
      grossHourlyRate: 10.12,
      startDate: '2018-08-02T00:00:00',
      weeklyHours: 15,
      _id: new ObjectID(),
      endDate: '2019-09-02T23:59:59',
    }],
  },
];

const contractEvents = [
  {
    _id: new ObjectID(),
    company: authCompany._id,
    sector: new ObjectID(),
    type: INTERNAL_HOUR,
    startDate: '2019-08-08T14:00:18.653Z',
    endDate: '2019-08-08T16:00:18.653Z',
    auxiliary: contractUsers[0]._id,
    internalHour: { _id: new ObjectID(), name: 'Formation' },
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    sector: new ObjectID(),
    type: ABSENCE,
    absence: PAID_LEAVE,
    absenceNature: DAILY,
    startDate: '2019-01-19T14:00:18.653Z',
    endDate: '2019-01-19T17:00:18.653Z',
    auxiliary: contractUsers[0]._id,
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    sector: new ObjectID(),
    type: ABSENCE,
    absence: PAID_LEAVE,
    absenceNature: DAILY,
    startDate: '2019-07-06T14:00:18.653Z',
    endDate: '2019-07-10T17:00:18.653Z',
    auxiliary: contractUsers[0]._id,
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    sector: new ObjectID(),
    type: INTERVENTION,
    startDate: '2019-01-16T09:30:19.543Z',
    endDate: '2019-01-16T11:30:21.653Z',
    auxiliary: contractUsers[0]._id,
    customer: customer._id,
    subscription: customer.subscriptions[0]._id,
    address: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    sector: new ObjectID(),
    type: INTERVENTION,
    startDate: '2019-01-17T14:30:19.543Z',
    endDate: '2019-01-17T16:30:19.543Z',
    auxiliary: contractUsers[0]._id,
    customer: customer._id,
    subscription: customer.subscriptions[0]._id,
    address: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await User.insertMany([...contractUsers, otherContractUser, userFromOtherCompany]);
  await Sector.create(sector);
  await Establishment.create(establishment);
  await Customer.create(customer);
  await Contract.insertMany([...contractsList, otherContract]);
  await Event.insertMany(contractEvents);
  await SectorHistory.insertMany(sectorHistories);
  await UserCompany.insertMany(contractUserCompanies);
};

module.exports = {
  contractsList,
  populateDB,
  contractUsers,
  customer,
  contractEvents,
  otherContract,
  otherContractUser,
  userFromOtherCompany,
  contractUserCompanies,
};
