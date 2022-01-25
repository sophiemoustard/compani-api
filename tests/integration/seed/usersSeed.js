const { v4: uuidv4 } = require('uuid');
const { ObjectId } = require('mongodb');
const moment = require('moment');
const User = require('../../../src/models/User');
const Customer = require('../../../src/models/Customer');
const Sector = require('../../../src/models/Sector');
const SectorHistory = require('../../../src/models/SectorHistory');
const UserCompany = require('../../../src/models/UserCompany');
const IdentityVerification = require('../../../src/models/IdentityVerification');
const Contract = require('../../../src/models/Contract');
const Establishment = require('../../../src/models/Establishment');
const { otherCompany, authCompany } = require('../../seed/authCompaniesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');
const { vendorAdmin } = require('../../seed/authUsersSeed');
const Course = require('../../../src/models/Course');
const { WEBAPP } = require('../../../src/helpers/constants');
const Helper = require('../../../src/models/Helper');
const {
  helperRoleId,
  coachRoleId,
  auxiliaryRoleId,
  planningReferentRoleId,
  auxiliaryWithoutCompanyRoleId,
  clientAdminRoleId,
  vendorAdminRoleId,
  trainerRoleId,
} = require('../../seed/authRolesSeed');

const establishmentList = [
  {
    _id: new ObjectId(),
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
    company: otherCompany._id,
  },
];

const customerFromOtherCompany = {
  _id: new ObjectId(),
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
  _id: new ObjectId(),
  identity: { firstname: 'Guigui', lastname: 'toto' },
  local: { email: 'othercompany@alenvi.io', password: '123456!eR' },
  role: { client: helperRoleId },
  refreshToken: uuidv4(),
  origin: WEBAPP,
};

const coachFromOtherCompany = {
  _id: new ObjectId(),
  identity: { firstname: 'Arnaud', lastname: 'toto' },
  local: { email: 'othercompanycoach@alenvi.io', password: '123456!eR' },
  role: { client: coachRoleId },
  refreshToken: uuidv4(),
  origin: WEBAPP,
};

const auxiliaryFromOtherCompany = {
  _id: new ObjectId(),
  identity: { firstname: 'Philou', lastname: 'toto' },
  local: { email: 'othercompanyauxiliary@alenvi.io', password: '123456!eR' },
  role: { client: auxiliaryRoleId },
  refreshToken: uuidv4(),
  origin: WEBAPP,
};

const usersFromOtherCompanyList = [helperFromOtherCompany, coachFromOtherCompany, auxiliaryFromOtherCompany];

const contractId = new ObjectId();
const contractNotStartedId = new ObjectId();
const endedContractId = new ObjectId();

const usersSeedList = [
  {
    _id: new ObjectId(),
    identity: { firstname: 'Auxiliary', lastname: 'Black' },
    local: { email: 'black@alenvi.io', password: '123456!eR' },
    role: { client: auxiliaryRoleId },
    refreshToken: uuidv4(),
    administrative: { certificates: [{ driveId: '1234567890' }], driveFolder: { driveId: '0987654321' } },
    contact: { phone: '0987654321' },
    contracts: [{ _id: contractId }],
    establishment: establishmentList[0]._id,
    picture: { publicId: 'a/public/id', link: 'https://the.complete.com/link/to/the/picture/storage/location' },
    origin: WEBAPP,
    formationExpoTokenList: ['ExponentPushToken[jeSuisUnIdExpo]'],
  },
  {
    _id: new ObjectId(),
    identity: { firstname: 'Auxiliary', lastname: 'White' },
    local: { email: 'white@alenvi.io', password: '123456!eR' },
    role: { client: auxiliaryRoleId },
    refreshToken: uuidv4(),
    administrative: { certificates: [{ driveId: '1234567890' }], driveFolder: { driveId: '0987654321' } },
    origin: WEBAPP,
    formationExpoTokenList: ['ExponentPushToken[jeSuisUnAutreIdExpo]'],
  },
  {
    _id: new ObjectId(),
    identity: { firstname: 'Coach3', lastname: 'Kitty' },
    local: { email: 'kitty@alenvi.io', password: '123456!eR' },
    refreshToken: uuidv4(),
    role: { client: coachRoleId },
    inactivityDate: '2018-11-01T12:52:27.461Z',
    origin: WEBAPP,
  },
  {
    _id: new ObjectId(),
    identity: { firstname: 'Helper1', lastname: 'Carolyn' },
    local: { email: 'carolyn@alenvi.io', password: '123456!eR' },
    refreshToken: uuidv4(),
    role: { client: helperRoleId },
    contracts: [new ObjectId()],
    passwordToken: { token: uuidv4(), expiresIn: new Date('2020-01-20').getTime() + 3600000 },
    origin: WEBAPP,
  },
  {
    _id: new ObjectId(),
    identity: { firstname: 'Auxiliary2', lastname: 'Yellow' },
    local: { email: 'aux@alenvi.io', password: '123456!eR' },
    role: { client: planningReferentRoleId },
    refreshToken: uuidv4(),
    contracts: [endedContractId, contractNotStartedId],
    administrative: { certificates: [{ driveId: '1234567890' }], driveFolder: { driveId: '0987654321' } },
    origin: WEBAPP,
  },
  {
    _id: new ObjectId(),
    identity: { firstname: 'AuxiliaryWithoutCompany', lastname: 'Green' },
    local: { email: 'withouCompany@alenvi.io', password: '123456!eR' },
    role: { client: auxiliaryWithoutCompanyRoleId },
    refreshToken: uuidv4(),
    administrative: { certificates: [{ driveId: '1234567890' }], driveFolder: { driveId: '0987654321' } },
    origin: WEBAPP,
  },
  {
    _id: new ObjectId(),
    identity: { firstname: 'adminion', lastname: 'Kitty' },
    local: { email: 'cae@alenvi.io', password: '123456!eR' },
    refreshToken: uuidv4(),
    role: { client: clientAdminRoleId },
    origin: WEBAPP,
  },
  {
    _id: new ObjectId(),
    identity: { firstname: 'no_role_trainee', lastname: 'test' },
    local: { email: 'no_role_trainee@alenvi.io', password: '123456!eR' },
    refreshToken: uuidv4(),
    origin: WEBAPP,
  },
  {
    _id: new ObjectId(),
    identity: { firstname: 'trainee_to_auxiliary', lastname: 'test' },
    local: { email: 'trainee_to_auxiliary@alenvi.io', password: '123456!eR' },
    refreshToken: uuidv4(),
    origin: WEBAPP,
  },
  {
    _id: new ObjectId(),
    identity: { firstname: 'user_without_company', lastname: 'test' },
    local: { email: 'user_without_company@alenvi.io', password: '123456!eR' },
    refreshToken: uuidv4(),
    origin: WEBAPP,
  },
  {
    _id: new ObjectId(),
    identity: { firstname: 'vendor', lastname: 'test' },
    local: { email: 'vendor@alenvi.io', password: '123456!eR' },
    role: { vendor: vendorAdminRoleId },
    refreshToken: uuidv4(),
    origin: WEBAPP,
  },
  {
    _id: new ObjectId(),
    identity: { firstname: 'trainer', lastname: 'no_company' },
    local: { email: 'traisner_no_company@compani.io', password: '123456!eR' },
    role: { vendor: trainerRoleId },
    refreshToken: uuidv4(),
    origin: WEBAPP,
  },
];

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
};

const helpers = [
  {
    _id: new ObjectId(),
    customer: customer._id,
    user: usersSeedList[3]._id,
    company: authCompany._id,
    referent: true,
  },
  {
    _id: new ObjectId(),
    customer: customerFromOtherCompany._id,
    user: helperFromOtherCompany._id,
    company: otherCompany._id,
    referent: true,
  },
];

const userCompanies = [
  { user: auxiliaryFromOtherCompany._id, company: otherCompany._id },
  { user: helperFromOtherCompany._id, company: otherCompany._id },
  { user: coachFromOtherCompany._id, company: otherCompany._id },
  { user: usersSeedList[0]._id, company: authCompany._id },
  { user: usersSeedList[1]._id, company: authCompany._id },
  { user: usersSeedList[2]._id, company: authCompany._id },
  { user: usersSeedList[3]._id, company: authCompany._id },
  { user: usersSeedList[4]._id, company: authCompany._id },
  { user: usersSeedList[5]._id, company: authCompany._id },
  { user: usersSeedList[6]._id, company: authCompany._id },
  { user: usersSeedList[7]._id, company: authCompany._id },
  { user: usersSeedList[8]._id, company: authCompany._id },
  { user: usersSeedList[10]._id, company: authCompany._id },
];

const userSectors = [
  { _id: new ObjectId(), name: 'Terre', company: authCompany._id },
  { _id: new ObjectId(), name: 'Lune', company: authCompany._id },
  { _id: new ObjectId(), name: 'Soleil', company: authCompany._id },
];

const contracts = [
  {
    _id: contractId,
    serialNumber: 'sadfasdgvxcsda',
    user: usersSeedList[0]._id,
    startDate: moment('2018-10-10').toDate(),
    createdAt: moment('2018-10-10').toDate(),
    company: authCompany._id,
  },
  {
    _id: contractNotStartedId,
    serialNumber: 'sdadsfsdfsd',
    user: usersSeedList[4]._id,
    startDate: moment().add(1, 'month').toDate(),
    createdAt: moment('2018-10-10').toDate(),
    company: authCompany._id,
  },
  {
    _id: endedContractId,
    serialNumber: 'testserialnumber',
    user: usersSeedList[4]._id,
    startDate: '2020-01-01T00:00:00',
    createdAt: '2020-06-01T23:59:59',
    company: authCompany._id,
  },
];

const sectorHistories = [
  { auxiliary: usersSeedList[0]._id, sector: userSectors[0]._id, company: authCompany._id, startDate: '2018-12-10' },
  { auxiliary: usersSeedList[1]._id, sector: userSectors[0]._id, company: authCompany._id, startDate: '2018-12-10' },
  { auxiliary: usersSeedList[4]._id, sector: userSectors[0]._id, company: authCompany._id, startDate: '2018-12-10' },
];

const followingCourses = [
  {
    _id: new ObjectId(),
    subProgram: new ObjectId(),
    type: 'inter_b2b',
    trainees: [helperFromOtherCompany._id, usersSeedList[0]._id],
    salesRepresentative: vendorAdmin._id,
  },
  {
    _id: new ObjectId(),
    subProgram: new ObjectId(),
    type: 'intra',
    company: new ObjectId(),
    trainees: [usersSeedList[0]._id],
    salesRepresentative: vendorAdmin._id,
  },
];

const identityVerifications = [
  { _id: new ObjectId(), email: 'carolyn@alenvi.io', code: '3310', createdAt: new Date('2021-01-25T10:05:32.582Z') },
];

const isInList = (list, user) => list.some(i => i._id.toHexString() === user._id.toHexString());

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    Contract.create(contracts),
    Course.create(followingCourses),
    Customer.create(customer, customerFromOtherCompany),
    Establishment.create(establishmentList),
    Helper.create(helpers),
    IdentityVerification.create(identityVerifications),
    Sector.create(userSectors),
    SectorHistory.create(sectorHistories),
    User.create([...usersSeedList, ...usersFromOtherCompanyList]),
    UserCompany.create(userCompanies),
  ]);
};

module.exports = {
  usersSeedList,
  usersFromOtherCompanyList,
  populateDB,
  isInList,
  customer,
  customerFromOtherCompany,
  helperFromOtherCompany,
  userSectors,
  sectorHistories,
  establishmentList,
  coachFromOtherCompany,
  auxiliaryFromOtherCompany,
  userCompanies,
};
