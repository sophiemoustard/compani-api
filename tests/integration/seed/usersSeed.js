const { v4: uuidv4 } = require('uuid');
const { ObjectId } = require('mongodb');
const moment = require('moment');
const User = require('../../../src/models/User');
const Step = require('../../../src/models/Step');
const SubProgram = require('../../../src/models/SubProgram');
const Activity = require('../../../src/models/Activity');
const Customer = require('../../../src/models/Customer');
const Sector = require('../../../src/models/Sector');
const SectorHistory = require('../../../src/models/SectorHistory');
const UserCompany = require('../../../src/models/UserCompany');
const IdentityVerification = require('../../../src/models/IdentityVerification');
const Contract = require('../../../src/models/Contract');
const Establishment = require('../../../src/models/Establishment');
const { otherCompany, authCompany, companyWithoutSubscription } = require('../../seed/authCompaniesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');
const { vendorAdmin } = require('../../seed/authUsersSeed');
const ActivityHistory = require('../../../src/models/ActivityHistory');
const Course = require('../../../src/models/Course');
const CompanyLinkRequest = require('../../../src/models/CompanyLinkRequest');
const { WEBAPP, MOBILE, VIDEO, INTER_B2B, INTRA, BLENDED } = require('../../../src/helpers/constants');
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
  local: { email: 'othercompany@alenvi.io' },
  role: { client: helperRoleId },
  refreshToken: uuidv4(),
  origin: WEBAPP,
};

const coachFromOtherCompany = {
  _id: new ObjectId(),
  identity: { firstname: 'Arnaud', lastname: 'toto' },
  local: { email: 'othercompanycoach@alenvi.io' },
  role: { client: coachRoleId },
  refreshToken: uuidv4(),
  origin: WEBAPP,
};

const auxiliaryFromOtherCompany = {
  _id: new ObjectId(),
  identity: { firstname: 'Philou', lastname: 'toto' },
  local: { email: 'othercompanyauxiliary@alenvi.io' },
  role: { client: auxiliaryRoleId },
  refreshToken: uuidv4(),
  origin: WEBAPP,
};

const usersFromOtherCompanyList = [helperFromOtherCompany, coachFromOtherCompany, auxiliaryFromOtherCompany];

const contractId = new ObjectId();
const contractNotStartedId = new ObjectId();
const endedContractId = new ObjectId();

const usersSeedList = [
  { // 0
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
  { // 1
    _id: new ObjectId(),
    identity: { firstname: 'Auxiliary', lastname: 'White' },
    local: { email: 'white@alenvi.io' },
    role: { client: auxiliaryRoleId },
    refreshToken: uuidv4(),
    administrative: { certificates: [{ driveId: '1234567890' }], driveFolder: { driveId: '0987654321' } },
    origin: WEBAPP,
    formationExpoTokenList: ['ExponentPushToken[jeSuisUnAutreIdExpo]'],
  },
  { // 2
    _id: new ObjectId(),
    identity: { firstname: 'Coach3', lastname: 'Kitty' },
    local: { email: 'kitty@alenvi.io' },
    refreshToken: uuidv4(),
    role: { client: coachRoleId },
    inactivityDate: '2018-11-01T12:52:27.461Z',
    origin: WEBAPP,
  },
  { // 3
    _id: new ObjectId(),
    identity: { firstname: 'Helper1', lastname: 'Carolyn' },
    local: { email: 'carolyn@alenvi.io', password: '123456!eR' },
    refreshToken: uuidv4(),
    role: { client: helperRoleId },
    contracts: [new ObjectId()],
    passwordToken: { token: uuidv4(), expiresIn: new Date('2020-01-20').getTime() + 3600000 },
    origin: WEBAPP,
  },
  { // 4
    _id: new ObjectId(),
    identity: { firstname: 'Auxiliary2', lastname: 'Yellow' },
    local: { email: 'aux@alenvi.io' },
    role: { client: planningReferentRoleId },
    refreshToken: uuidv4(),
    contracts: [endedContractId, contractNotStartedId],
    administrative: { certificates: [{ driveId: '1234567890' }], driveFolder: { driveId: '0987654321' } },
    origin: WEBAPP,
  },
  { // 5
    _id: new ObjectId(),
    identity: { firstname: 'AuxiliaryWithoutCompany', lastname: 'Green' },
    local: { email: 'withouCompany@alenvi.io' },
    role: { client: auxiliaryWithoutCompanyRoleId },
    refreshToken: uuidv4(),
    administrative: { certificates: [{ driveId: '1234567890' }], driveFolder: { driveId: '0987654321' } },
    origin: WEBAPP,
  },
  { // 6
    _id: new ObjectId(),
    identity: { firstname: 'adminion', lastname: 'Kitty' },
    local: { email: 'cae@alenvi.io' },
    refreshToken: uuidv4(),
    role: { client: clientAdminRoleId },
    origin: WEBAPP,
  },
  { // 7
    _id: new ObjectId(),
    identity: { firstname: 'no_role_trainee', lastname: 'test' },
    local: { email: 'no_role_trainee@alenvi.io' },
    refreshToken: uuidv4(),
    origin: WEBAPP,
  },
  { // 8
    _id: new ObjectId(),
    identity: { firstname: 'trainee_to_auxiliary', lastname: 'test' },
    local: { email: 'trainee_to_auxiliary@alenvi.io' },
    refreshToken: uuidv4(),
    origin: WEBAPP,
  },
  { // 9
    _id: new ObjectId(),
    identity: { firstname: 'user_without_company', lastname: 'test' },
    local: { email: 'user_without_company@alenvi.io' },
    refreshToken: uuidv4(),
    origin: WEBAPP,
  },
  { // 10
    _id: new ObjectId(),
    identity: { firstname: 'vendor', lastname: 'test' },
    local: { email: 'vendor@alenvi.io' },
    role: { vendor: vendorAdminRoleId },
    refreshToken: uuidv4(),
    origin: WEBAPP,
  },
  { // 11
    _id: new ObjectId(),
    identity: { firstname: 'trainer', lastname: 'no_company' },
    local: { email: 'traisner_no_company@compani.io' },
    role: { vendor: trainerRoleId },
    refreshToken: uuidv4(),
    origin: WEBAPP,
  },
  { // 12
    _id: new ObjectId(),
    identity: { firstname: 'norole', lastname: 'no_company' },
    refreshToken: uuidv4(),
    local: { email: 'norole.nocompany@userseed.fr', password: 'fdsf5P56D' },
    contact: { phone: '0798640728' },
    picture: { link: 'qwertyuio', pictureId: 'poiuytrew' },
    origin: MOBILE,
    formationExpoTokenList: ['ExponentPushToken[jeSuisUnIdExpo]'],
  },
];

const companyLinkRequest = {
  _id: new ObjectId(),
  user: usersSeedList[12]._id,
  company: authCompany._id,
};

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
  { // old inactive user company
    user: usersSeedList[0]._id,
    company: companyWithoutSubscription._id,
    startDate: '2022-01-01T23:00:00.000Z',
    endDate: '2022-11-30T23:00:00.000Z',
  },
  { // old inactive user company
    user: usersSeedList[1]._id,
    company: authCompany._id,
    startDate: '2022-01-01T23:00:00.000Z',
    endDate: '2022-11-30T23:00:00.000Z',
  },
  // current user companies
  { user: auxiliaryFromOtherCompany._id, company: otherCompany._id, startDate: '2022-01-01T23:00:00.000Z' },
  { user: helperFromOtherCompany._id, company: otherCompany._id, startDate: '2022-01-01T23:00:00.000Z' },
  { user: coachFromOtherCompany._id, company: otherCompany._id, startDate: '2022-01-01T23:00:00.000Z' },
  { user: usersSeedList[0]._id, company: authCompany._id, startDate: '2022-01-01T23:00:00.000Z' },
  { user: usersSeedList[1]._id, company: authCompany._id, startDate: '2022-01-01T23:00:00.000Z' },
  { user: usersSeedList[3]._id, company: authCompany._id, startDate: '2022-01-01T23:00:00.000Z' },
  { user: usersSeedList[4]._id, company: authCompany._id, startDate: '2022-01-01T23:00:00.000Z' },
  { user: usersSeedList[6]._id, company: authCompany._id, startDate: '2022-01-01T23:00:00.000Z' },
  { user: usersSeedList[7]._id, company: authCompany._id, startDate: '2022-01-01T23:00:00.000Z' },
  { user: usersSeedList[8]._id, company: authCompany._id, startDate: '2022-01-01T23:00:00.000Z' },
  { // old inactive user company
    user: usersSeedList[2]._id,
    company: authCompany._id,
    startDate: '2022-01-01T23:00:00.000Z',
    endDate: '2022-12-30T23:00:00.000Z',
  },
  { // old inactive user company
    user: usersSeedList[10]._id,
    company: authCompany._id,
    startDate: '2022-12-19T23:00:00.000Z',
    endDate: '2022-12-29T23:00:00.000Z',
  },
  // startDate must be greater than 20/12/2022
  { user: usersSeedList[10]._id, company: authCompany._id, startDate: '2022-12-30T23:00:00.000Z' },
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

const activityList = [{ _id: new ObjectId(), name: 'great activity', type: VIDEO, cards: [] }];

const stepList = [{ _id: new ObjectId(), name: 'etape', type: 'e_learning', activities: [activityList[0]._id] }];
const subProgram = { _id: new ObjectId(), name: 'program', steps: stepList };

const coursesList = [
  {
    _id: new ObjectId(),
    subProgram: new ObjectId(),
    type: INTER_B2B,
    format: BLENDED,
    trainees: [helperFromOtherCompany._id, usersSeedList[0]._id],
    companies: [otherCompany._id, authCompany._id],
    salesRepresentative: vendorAdmin._id,
  },
  {
    _id: new ObjectId(),
    subProgram: new ObjectId(),
    type: INTRA,
    format: BLENDED,
    maxTrainees: 8,
    trainees: [usersSeedList[0]._id],
    companies: [authCompany._id],
    salesRepresentative: vendorAdmin._id,
  },
  {
    _id: new ObjectId(),
    subProgram: subProgram._id,
    misc: 'elearning for all',
    type: INTER_B2B,
    format: BLENDED,
    trainees: [usersSeedList[12]._id],
    companies: [authCompany._id],
    salesRepresentative: vendorAdmin._id,
  },
];

const activityHistoryList = [
  { _id: new ObjectId(), activity: activityList[0]._id, user: usersSeedList[12]._id, date: '2021-01-25T10:05:32.582Z' },
];

const identityVerifications = [
  { _id: new ObjectId(), email: 'carolyn@alenvi.io', code: '3310', createdAt: new Date('2021-01-25T10:05:32.582Z') },
];

const isInList = (list, user) => list.some(i => i._id.toHexString() === user._id.toHexString());

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    Activity.create(activityList),
    ActivityHistory.create(activityHistoryList),
    Contract.create(contracts),
    Course.create(coursesList),
    Customer.create(customer, customerFromOtherCompany),
    Establishment.create(establishmentList),
    Helper.create(helpers),
    IdentityVerification.create(identityVerifications),
    Sector.create(userSectors),
    SectorHistory.create(sectorHistories),
    Step.create(stepList),
    SubProgram.create(subProgram),
    User.create([...usersSeedList, ...usersFromOtherCompanyList]),
    UserCompany.create(userCompanies),
    CompanyLinkRequest.create(companyLinkRequest),
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
  activityList,
};
