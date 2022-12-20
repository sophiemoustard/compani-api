const { v4: uuidv4 } = require('uuid');
const { ObjectId } = require('mongodb');
const Contract = require('../../../src/models/Contract');
const User = require('../../../src/models/User');
const Customer = require('../../../src/models/Customer');
const Sector = require('../../../src/models/Sector');
const SectorHistory = require('../../../src/models/SectorHistory');
const Event = require('../../../src/models/Event');
const Establishment = require('../../../src/models/Establishment');
const UserCompany = require('../../../src/models/UserCompany');
const { DAILY, PAID_LEAVE, INTERNAL_HOUR, ABSENCE, INTERVENTION, WEBAPP } = require('../../../src/helpers/constants');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');
const { authCompany, otherCompany } = require('../../seed/authCompaniesSeed');
const { auxiliaryRoleId } = require('../../seed/authRolesSeed');

const customer = {
  _id: new ObjectId(),
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
    _id: new ObjectId(),
    service: new ObjectId(),
    versions: [{
      unitTTCRate: 12,
      weeklyHours: 12,
      evenings: 2,
      sundays: 1,
      startDate: '2018-01-01T10:00:00.000+01:00',
    }],
  }],
  payment: { bankAccountOwner: 'David gaudu', iban: '', bic: '', mandates: [{ rum: 'R012345678903456789' }] },
  driveFolder: { driveId: '1234567890' },
};

const otherContractUser = {
  _id: new ObjectId(),
  identity: { firstname: 'OCCU', lastname: 'OCCU' },
  local: { email: 'other-company-contract-user@alenvi.io' },
  refreshToken: uuidv4(),
  role: { client: auxiliaryRoleId },
  contracts: [new ObjectId()],
  prefixNumber: 103,
  origin: WEBAPP,
};

const sector = { _id: new ObjectId(), company: authCompany._id };

const establishment = {
  _id: new ObjectId(),
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
    _id: new ObjectId(),
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
    local: { email: 'test7@alenvi.io' },
    refreshToken: uuidv4(),
    role: { client: auxiliaryRoleId },
    contracts: [new ObjectId()],
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
    _id: new ObjectId(),
    identity: {
      firstname: 'ayolo',
      lastname: 'Toto',
      nationality: 'FR',
      socialSecurityNumber: '2987654334562',
      birthDate: '1999-09-08T00:00:00',
      birthCity: 'Paris',
      birthState: 75,
    },
    establishment: new ObjectId(),
    local: { email: 'tototest@alenvi.io' },
    refreshToken: uuidv4(),
    role: { client: auxiliaryRoleId },
    contracts: [new ObjectId()],
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
    _id: new ObjectId(),
    identity: {
      firstname: 'ok',
      lastname: 'Titi',
      nationality: 'FR',
      socialSecurityNumber: '2987654334562',
      birthDate: '1999-09-08T00:00:00',
      birthCity: 'Paris',
      birthState: 75,
    },
    establishment: new ObjectId(),
    local: { email: 'ok@alenvi.io' },
    refreshToken: uuidv4(),
    role: { client: auxiliaryRoleId },
    contact: {
      address: {
        fullAddress: '37 rue de ponthieu 75008 Paris',
        zipCode: '75008',
        city: 'Paris',
        street: '37 rue de Ponthieu',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
    },
    contracts: [new ObjectId()],
    origin: WEBAPP,
  },
  {
    _id: new ObjectId(),
    identity: { firstname: 'contract', lastname: 'Titi' },
    local: { email: 'contract@alenvi.io' },
    refreshToken: uuidv4(),
    role: { client: auxiliaryRoleId },
    contracts: [new ObjectId()],
    sector: sector._id,
    origin: WEBAPP,
  },
  {
    _id: new ObjectId(),
    identity: { firstname: 'contract', lastname: 'Uelle' },
    local: { email: 'dfghjkscs@alenvi.io' },
    refreshToken: uuidv4(),
    role: { client: auxiliaryRoleId },
    contracts: [new ObjectId()],
    sector: sector._id,
    origin: WEBAPP,
  },
  {
    _id: new ObjectId(),
    identity: { firstname: 'contract', lastname: 'ant' },
    local: { email: 'iuytr@alenvi.io' },
    refreshToken: uuidv4(),
    role: { client: auxiliaryRoleId },
    contracts: [new ObjectId()],
    sector: sector._id,
    origin: WEBAPP,
  },
  {
    _id: new ObjectId(),
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
    local: { email: 'dfghjk@alenvi.io' },
    refreshToken: uuidv4(),
    role: { client: auxiliaryRoleId },
    contracts: [new ObjectId()],
    sector: sector._id,
    origin: WEBAPP,
    establishment: new ObjectId(),
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
  versions: [{ grossHourlyRate: 10.28, startDate: '2018-12-03T23:00:00.000Z', weeklyHours: 9, _id: new ObjectId() }],
};

const contractUserCompanies = [
  // old inactive user company
  {
    _id: new ObjectId(),
    user: contractUsers[0]._id,
    company: otherCompany._id,
    startDate: '2022-01-01T23:00:00.000Z',
    endDate: '2022-11-30T23:00:00.000Z',
  },
  { _id: new ObjectId(), user: contractUsers[0]._id, company: authCompany._id },
  { _id: new ObjectId(), user: contractUsers[1]._id, company: authCompany._id },
  { _id: new ObjectId(), user: contractUsers[2]._id, company: authCompany._id },
  { _id: new ObjectId(), user: contractUsers[3]._id, company: authCompany._id },
  { _id: new ObjectId(), user: contractUsers[4]._id, company: authCompany._id },
  { _id: new ObjectId(), user: contractUsers[5]._id, company: authCompany._id },
  { _id: new ObjectId(), user: contractUsers[6]._id, company: authCompany._id },
  { _id: new ObjectId(), user: otherContractUser._id, company: otherCompany._id },
];

const contractsList = [
  {
    serialNumber: 'mnbvcxzaserfghjiu',
    user: contractUsers[0]._id,
    startDate: '2018-12-03T23:00:00.000Z',
    _id: contractUsers[0].contracts[0],
    company: authCompany._id,
    versions: [{ grossHourlyRate: 10.28, startDate: '2018-12-03T23:00:00.000Z', weeklyHours: 9, _id: new ObjectId() }],
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
    versions: [{ grossHourlyRate: 10.28, startDate: '2018-12-03T23:00:00.000Z', weeklyHours: 9, _id: new ObjectId() }],
  },
  {
    serialNumber: 'qwdfgbnhygfc',
    endDate: null,
    company: authCompany._id,
    user: contractUsers[2]._id,
    startDate: '2018-08-02T00:00:00',
    _id: contractUsers[2].contracts[0],
    versions: [{ grossHourlyRate: 10.12, startDate: '2018-08-02T00:00:00', weeklyHours: 15, _id: new ObjectId() }],
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
      _id: new ObjectId(),
    }],
  },
  {
    serialNumber: 'cacnxnkzlas',
    user: contractUsers[5]._id,
    startDate: '2017-08-02T00:00:00',
    _id: contractUsers[5].contracts[0],
    company: authCompany._id,
    versions: [
      {
        endDate: '2017-09-02T23:59:59',
        grossHourlyRate: 10.12,
        startDate: '2017-08-02T00:00:00',
        weeklyHours: 15,
        _id: new ObjectId(),
      },
      {
        endDate: '2017-10-10T23:59:59',
        grossHourlyRate: 10.12,
        startDate: '2017-09-03T00:00:00',
        weeklyHours: 22,
        _id: new ObjectId(),
      },
    ],
  },
  {
    serialNumber: 'sldfnasdlknfkds',
    user: contractUsers[3]._id,
    startDate: '2018-08-02T00:00:00',
    _id: contractUsers[3].contracts[0],
    company: authCompany._id,
    versions: [{ grossHourlyRate: 10.12, startDate: '2018-08-02T00:00:00', weeklyHours: 15, _id: new ObjectId() }],
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
      _id: new ObjectId(),
      endDate: '2019-09-02T23:59:59',
    }],
  },
];

const contractEvents = [
  {
    _id: new ObjectId(),
    company: authCompany._id,
    sector: new ObjectId(),
    type: INTERNAL_HOUR,
    startDate: '2019-08-08T14:00:18.653Z',
    endDate: '2019-08-08T16:00:18.653Z',
    auxiliary: contractUsers[0]._id,
    internalHour: { _id: new ObjectId(), name: 'Formation' },
  },
  {
    _id: new ObjectId(),
    company: authCompany._id,
    sector: new ObjectId(),
    type: ABSENCE,
    absence: PAID_LEAVE,
    absenceNature: DAILY,
    startDate: '2019-01-19T14:00:18.653Z',
    endDate: '2019-01-19T17:00:18.653Z',
    auxiliary: contractUsers[0]._id,
  },
  {
    _id: new ObjectId(),
    company: authCompany._id,
    sector: new ObjectId(),
    type: ABSENCE,
    absence: PAID_LEAVE,
    absenceNature: DAILY,
    startDate: '2019-07-06T14:00:18.653Z',
    endDate: '2019-07-10T17:00:18.653Z',
    auxiliary: contractUsers[0]._id,
  },
  {
    _id: new ObjectId(),
    company: authCompany._id,
    sector: new ObjectId(),
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
    _id: new ObjectId(),
    company: authCompany._id,
    sector: new ObjectId(),
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

  await Promise.all([
    Contract.create([...contractsList, otherContract]),
    Customer.create(customer),
    Establishment.create(establishment),
    Event.create(contractEvents),
    Sector.create(sector),
    SectorHistory.create(sectorHistories),
    UserCompany.create(contractUserCompanies),
    User.create([...contractUsers, otherContractUser]),
  ]);
};

module.exports = {
  contractsList,
  populateDB,
  contractUsers,
  contractEvents,
  otherContract,
  otherContractUser,
  contractUserCompanies,
};
