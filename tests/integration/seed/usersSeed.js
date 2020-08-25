const { v4: uuidv4 } = require('uuid');
const { ObjectID } = require('mongodb');
const moment = require('moment');
const User = require('../../../src/models/User');
const Customer = require('../../../src/models/Customer');
const Sector = require('../../../src/models/Sector');
const SectorHistory = require('../../../src/models/SectorHistory');
const Contract = require('../../../src/models/Contract');
const Establishment = require('../../../src/models/Establishment');
const { rolesList, populateDBForAuthentication, otherCompany, authCompany } = require('./authenticationSeed');
const { authCustomer } = require('../../seed/customerSeed');
const Course = require('../../../src/models/Course');

const establishmentList = [
  {
    _id: new ObjectID(),
    name: 'Toto',
    siret: '12345678901234',
    address: {
      street: '15, rue du test',
      fullAddress: '15, rue du test 75007 Paris',
      zipCode: '75007',
      city: 'Paris',
      location: { type: 'Point', coordinates: [4.849302, 2.90887] },
    },
    phone: '0123456789',
    workHealthService: 'MT01',
    urssafCode: '117',
    company: authCompany._id,
  },
  {
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
    company: otherCompany._id,
  },
];

const customerFromOtherCompany = {
  _id: new ObjectID(),
  identity: { title: 'mr', firstname: 'toto', lastname: 'test' },
  company: otherCompany._id,
  contact: {
    primaryAddress: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
    phone: '0123456789',
    accessCodes: 'porte c3po',
  },
};

const helperFromOtherCompany = {
  _id: new ObjectID(),
  identity: { firstname: 'test', lastname: 'toto' },
  local: { email: 'othercompany@alenvi.io', password: '123456!eR' },
  role: { client: rolesList.find(role => role.name === 'helper')._id },
  refreshToken: uuidv4(),
  company: otherCompany._id,
  inactivityDate: null,
  customers: [customerFromOtherCompany._id],
};

const coachFromOtherCompany = {
  _id: new ObjectID(),
  identity: { firstname: 'test', lastname: 'toto' },
  local: { email: 'othercompanycoach@alenvi.io', password: '123456!eR' },
  role: { client: rolesList.find(role => role.name === 'coach')._id },
  refreshToken: uuidv4(),
  company: otherCompany._id,
  inactivityDate: null,
};

const auxiliaryFromOtherCompany = {
  _id: new ObjectID(),
  identity: { firstname: 'test', lastname: 'toto' },
  local: { email: 'othercompanyauxiliary@alenvi.io', password: '123456!eR' },
  role: { client: rolesList.find(role => role.name === 'auxiliary')._id },
  refreshToken: uuidv4(),
  company: otherCompany._id,
  inactivityDate: null,
};

const contractId = new ObjectID();
const contractNotStartedId = new ObjectID();

const usersSeedList = [
  {
    _id: new ObjectID(),
    identity: { firstname: 'Auxiliary', lastname: 'Black' },
    local: { email: 'black@alenvi.io', password: '123456!eR' },
    role: { client: rolesList.find(role => role.name === 'auxiliary')._id },
    refreshToken: uuidv4(),
    company: authCompany._id,
    administrative: {
      certificates: [{ driveId: '1234567890' }],
      driveFolder: { driveId: '0987654321' },
    },
    inactivityDate: null,
    contracts: [{ _id: contractId }],
    establishment: establishmentList[0]._id,
    picture: {
      publicId: 'a/public/id',
      link: 'https://the.complete.com/link/to/the/picture/storage/location',
    },
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Auxiliary', lastname: 'White' },
    local: { email: 'white@alenvi.io', password: '123456!eR' },
    role: { client: rolesList.find(role => role.name === 'auxiliary')._id },
    refreshToken: uuidv4(),
    company: authCompany._id,
    contracts: [],
    administrative: {
      certificates: [{ driveId: '1234567890' }],
      driveFolder: { driveId: '0987654321' },
    },
    inactivityDate: null,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Admin3', lastname: 'Kitty' },
    local: { email: 'kitty@alenvi.io', password: '123456!eR' },
    refreshToken: uuidv4(),
    company: authCompany._id,
    role: { client: rolesList.find(role => role.name === 'client_admin')._id },
    inactivityDate: '2018-11-01T12:52:27.461Z',
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Helper1', lastname: 'Carolyn' },
    local: { email: 'carolyn@alenvi.io', password: '123456!eR' },
    inactivityDate: null,
    refreshToken: uuidv4(),
    company: authCompany._id,
    role: { client: rolesList.find(role => role.name === 'helper')._id },
    contracts: [new ObjectID()],
    passwordToken: { token: uuidv4(), expiresIn: new Date('2020-01-20').getTime() + 3600000 },
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Auxiliary2', lastname: 'White' },
    local: { email: 'aux@alenvi.io', password: '123456!eR' },
    role: { client: rolesList.find(role => role.name === 'auxiliary')._id },
    refreshToken: uuidv4(),
    company: authCompany._id,
    contracts: [contractNotStartedId],
    administrative: {
      certificates: [{ driveId: '1234567890' }],
      driveFolder: { driveId: '0987654321' },
    },
    inactivityDate: null,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'AuxiliaryWithoutCompany', lastname: 'White' },
    local: { email: 'withouCompany@alenvi.io', password: '123456!eR' },
    role: { client: rolesList.find(role => role.name === 'auxiliary_without_company')._id },
    refreshToken: uuidv4(),
    company: authCompany._id,
    contracts: [],
    administrative: {
      certificates: [{ driveId: '1234567890' }],
      driveFolder: { driveId: '0987654321' },
    },
    inactivityDate: null,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'no_role_trainee', lastname: 'test' },
    local: { email: 'no_role_trainee@alenvi.io', password: '123456!eR' },
    role: {},
    refreshToken: uuidv4(),
    company: authCompany._id,
    inactivityDate: null,
  },
];

const userSectors = [
  { _id: new ObjectID(), name: 'Terre', company: authCompany._id },
  { _id: new ObjectID(), name: 'Lune', company: authCompany._id },
  { _id: new ObjectID(), name: 'Soleil', company: authCompany._id },
];

const userPayload = {
  identity: { firstname: 'Auxiliary2', lastname: 'Kirk' },
  local: { email: 'kirk@alenvi.io' },
  role: rolesList.find(role => role.name === 'auxiliary')._id,
  sector: userSectors[0]._id,
};

const contracts = [
  {
    _id: contractId,
    user: usersSeedList[0]._id,
    startDate: moment('2018-10-10').toDate(),
    createdAt: moment('2018-10-10').toDate(),
    company: authCompany._id,
  },
  {
    _id: contractNotStartedId,
    user: usersSeedList[4]._id,
    startDate: moment().add(1, 'month').toDate(),
    createdAt: moment('2018-10-10').toDate(),
    company: authCompany._id,
  },
];

const sectorHistories = usersSeedList
  .filter(user => user.role.client === rolesList.find(role => role.name === 'auxiliary')._id)
  .map(user => ({
    auxiliary: user._id,
    sector: userSectors[0]._id,
    company: authCompany._id,
    startDate: '2018-12-10',
  }));

const followingCourses = [
  {
    _id: new ObjectID(),
    subProgram: new ObjectID(),
    type: 'inter_b2b',
    trainees: [helperFromOtherCompany._id, usersSeedList[0]._id],
  },
  {
    _id: new ObjectID(),
    subProgram: new ObjectID(),
    type: 'intra',
    company: new ObjectID(),
    trainees: [usersSeedList[0]._id],
  },
];

const isInList = (list, user) => list.some(i => i._id.toHexString() === user._id.toHexString());
const isExistingRole = (roleId, roleName) => roleId === rolesList.find(r => r.name === roleName)._id;

const populateDB = async () => {
  await User.deleteMany({});
  await Customer.deleteMany({});
  await Sector.deleteMany({});
  await SectorHistory.deleteMany({});
  await Contract.deleteMany({});
  await Establishment.deleteMany({});
  await Course.deleteMany({});

  await populateDBForAuthentication();
  await User.create(usersSeedList.concat([helperFromOtherCompany, coachFromOtherCompany, auxiliaryFromOtherCompany]));
  await Customer.create(customerFromOtherCompany);
  await Customer.create(authCustomer);
  await Sector.create(userSectors);
  await SectorHistory.create(sectorHistories);
  await Contract.insertMany(contracts);
  await Establishment.insertMany(establishmentList);
  await Course.insertMany(followingCourses);
};

module.exports = {
  usersSeedList,
  userPayload,
  populateDB,
  isInList,
  isExistingRole,
  customerFromOtherCompany,
  helperFromOtherCompany,
  userSectors,
  sectorHistories,
  establishmentList,
  coachFromOtherCompany,
  auxiliaryFromOtherCompany,
  authCustomer,
};
