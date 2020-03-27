const { ObjectID } = require('mongodb');
const uuidv4 = require('uuid/v4');
const memoize = require('lodash/memoize');
const Role = require('../../../src/models/Role');
const Right = require('../../../src/models/Right');
const User = require('../../../src/models/User');
const Company = require('../../../src/models/Company');
const Sector = require('../../../src/models/Sector');
const SectorHistory = require('../../../src/models/SectorHistory');
const {
  VENDOR_ADMIN,
  CLIENT_ADMIN,
  AUXILIARY,
  HELPER,
  COACH,
  PLANNING_REFERENT,
  AUXILIARY_WITHOUT_COMPANY,
  TRAINING_ORGANISATION_MANAGER,
  TRAINER,
} = require('../../../src/helpers/constants');
const { rolesList, rightsList } = require('../../seed/roleSeed');
const app = require('../../../server');

const authCompany = {
  _id: new ObjectID(),
  name: 'Test SAS',
  tradeName: 'Test',
  prefixNumber: 101,
  iban: '1234',
  bic: '5678',
  ics: '9876',
  folderId: '0987654321',
  directDebitsFolderId: '1234567890',
  customersFolderId: 'mnbvcxz',
  auxiliariesFolderId: 'iuytre',
  customersConfig: {
    billingPeriod: 'two_weeks',
  },
};

const otherCompany = {
  _id: new ObjectID(),
  prefixNumber: 102,
  name: 'Other test SAS',
  tradeName: 'Other test',
  folderId: '0987654321',
  directDebitsFolderId: '1234567890',
  customersFolderId: 'mnbvcxz',
  auxiliariesFolderId: 'iuytre',
};

const userList = [
  {
    _id: new ObjectID(),
    identity: { firstname: 'client_admin', lastname: 'Chef' },
    refreshToken: uuidv4(),
    local: { email: 'admin@alenvi.io', password: '123456!eR' },
    role: { client: rolesList.find(role => role.name === CLIENT_ADMIN)._id },
    company: authCompany._id,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Coach', lastname: 'Calif' },
    local: { email: 'coach@alenvi.io', password: '123456!eR' },
    refreshToken: uuidv4(),
    role: { client: rolesList.find(role => role.name === COACH)._id },
    company: authCompany._id,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Auxiliary', lastname: 'Test', title: 'mr' },
    local: { email: 'auxiliary@alenvi.io', password: '123456!eR' },
    refreshToken: uuidv4(),
    role: { client: rolesList.find(role => role.name === AUXILIARY)._id },
    company: authCompany._id,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Auxiliary without company', lastname: 'Test' },
    local: { email: 'auxiliarywithoutcompany@alenvi.io', password: '123456!eR' },
    refreshToken: uuidv4(),
    role: { client: rolesList.find(role => role.name === AUXILIARY_WITHOUT_COMPANY)._id },
    company: authCompany._id,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'PlanningReferent', lastname: 'Test', title: 'mrs' },
    local: { email: 'planning-referent@alenvi.io', password: '123456!eR' },
    refreshToken: uuidv4(),
    role: { client: rolesList.find(role => role.name === PLANNING_REFERENT)._id },
    company: authCompany._id,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Helper', lastname: 'Test' },
    local: { email: 'helper@alenvi.io', password: '123456!eR' },
    refreshToken: uuidv4(),
    role: { client: rolesList.find(role => role.name === HELPER)._id },
    company: authCompany._id,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'vendor_admin', lastname: 'SuperChef' },
    refreshToken: uuidv4(),
    local: { email: 'vendor-admin@alenvi.io', password: '123456!eR' },
    role: { vendor: rolesList.find(role => role.name === VENDOR_ADMIN)._id },
    company: authCompany._id,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'training_organisation_manager', lastname: 'ROP' },
    refreshToken: uuidv4(),
    local: { email: 'training-organisation-manager@alenvi.io', password: '123456!eR' },
    role: { vendor: rolesList.find(role => role.name === TRAINING_ORGANISATION_MANAGER)._id },
    company: authCompany._id,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'trainer', lastname: 'trainer' },
    status: 'internal',
    refreshToken: uuidv4(),
    local: { email: 'trainer@alenvi.io', password: '123456!eR' },
    role: { vendor: rolesList.find(role => role.name === TRAINER)._id },
    company: authCompany._id,
  },
];

const sector = {
  _id: new ObjectID(),
  name: 'Test',
  company: authCompany._id,
};

const sectorHistories = [
  {
    auxiliary: userList[2]._id,
    sector: sector._id,
    company: authCompany._id,
    startDate: '2018-12-10',
  },
  {
    auxiliary: userList[4]._id,
    sector: sector._id,
    company: authCompany._id,
    startDate: '2018-12-10',
  },
];

const populateDBForAuthentication = async () => {
  await Role.deleteMany({});
  await Right.deleteMany({});
  await User.deleteMany({});
  await Company.deleteMany({});
  await Sector.deleteMany({});
  await SectorHistory.deleteMany({});

  await new Company(authCompany).save();
  await new Company(otherCompany).save();
  await new Sector(sector).save();
  await SectorHistory.insertMany(sectorHistories);
  await Right.insertMany(rightsList);
  await Role.insertMany(rolesList);
  for (let i = 0; i < userList.length; i++) {
    await (new User(userList[i])).save();
  }
};

const getUser = (roleName, list = userList) => {
  const role = rolesList.find(r => r.name === roleName);
  return list.find(u => u.role[role.interface] && u.role[role.interface].toHexString() === role._id.toHexString());
};

const getTokenByCredentials = memoize(
  async (credentials) => {
    const response = await app.inject({
      method: 'POST',
      url: '/users/authenticate',
      payload: credentials,
    });

    return response.result.data.token;
  },
  // do not stringify the 'credentials' object, because the order of the props can't be predicted
  credentials => JSON.stringify([credentials.email, credentials.password])
);

const getToken = (roleName, list) => {
  const user = getUser(roleName, list);
  return getTokenByCredentials(user.local);
};

module.exports = {
  rolesList,
  rightsList,
  userList,
  populateDBForAuthentication,
  getUser,
  getToken,
  getTokenByCredentials,
  authCompany,
  otherCompany,
};
