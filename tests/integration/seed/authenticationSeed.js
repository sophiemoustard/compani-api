const { ObjectID } = require('mongodb');
const uuidv4 = require('uuid/v4');
const memoize = require('lodash/memoize');
const Role = require('../../../src/models/Role');
const Right = require('../../../src/models/Right');
const User = require('../../../src/models/User');
const Company = require('../../../src/models/Company');
const app = require('../../../server');

const rightsList = [
  {
    _id: new ObjectID(),
    description: 'Edit config',
    permission: 'config:edit',
  },
  {
    _id: new ObjectID(),
    description: 'Read config',
    permission: 'config:read',
  },
  {
    _id: new ObjectID(),
    description: 'Edit billing info',
    permission: 'bills:edit',
  },
  {
    _id: new ObjectID(),
    description: 'Read billing info',
    permission: 'bills:read',
  },
  {
    _id: new ObjectID(),
    description: 'Edit payment info',
    permission: 'payments:edit',
  },
  {
    _id: new ObjectID(),
    description: 'Create payment list',
    permission: 'payments:list:create',
  },
  {
    _id: new ObjectID(),
    description: 'Edit pay info',
    permission: 'pay:edit',
  },
  {
    _id: new ObjectID(),
    description: 'Read pay info',
    permission: 'pay:read',
  },
  {
    _id: new ObjectID(),
    description: 'Editer la liste de contrats',
    permission: 'contracts:edit',
  },
  {
    _id: new ObjectID(),
    description: 'Exporter des données',
    permission: 'exports:read',
  },
  {
    _id: new ObjectID(),
    description: 'Lister les utilisateurs',
    permission: 'users:list',
    name: 'users-list',
  },
  {
    _id: new ObjectID(),
    description: 'Editer un utilisateur',
    permission: 'users:edit',
    name: 'users-edit',
  },
  {
    _id: new ObjectID(),
    description: 'Editer un évènement',
    permission: 'events:edit',
    name: 'events-edit',
  },
  {
    _id: new ObjectID(),
    description: 'Consulter les évènements',
    permission: 'events:read',
    name: 'events-read',
  },
  {
    _id: new ObjectID(),
    description: 'Editer son évènement',
    permission: 'events:own:edit',
    name: 'events-own-edit',
  },
  {
    _id: new ObjectID(),
    description: 'Créer ou supprimer des bénéficiaires',
    permission: 'customers:create',
  },
  {
    _id: new ObjectID(),
    description: 'Consulter les données de bénéficiaires',
    permission: 'customers:read',
  },
  {
    _id: new ObjectID(),
    description: 'Editer les données de bénéficiaires',
    permission: 'customers:edit',
  },
  {
    _id: new ObjectID(),
    description: 'Editer les données administratives de bénéficiaires',
    permission: 'customers:administrative:edit',
  },
  {
    _id: new ObjectID(),
    description: 'Editer les informations de la compagnie',
    permission: 'companies:edit',
  },
  {
    _id: new ObjectID(),
    description: 'Consulter les roles',
    permission: 'roles:read',
  },
  {
    _id: new ObjectID(),
    description: 'Editer les documents de paie',
    permission: 'paydocuments:edit',
  },
];

const coachRights = [
  'config:read',
  'bills:read',
  'payments:edit',
  'pay:read',
  'contracts:edit',
  'exports:read',
  'users:list',
  'users:edit',
  'events:edit',
  'events:read',
  'customers:create',
  'customers:read',
  'customers:edit',
  'customers:administrative:edit',
  'roles:read',
  'paydocuments:edit',
];
const auxiliaryRights = [
  'config:read',
  'pay:read',
  'users:list',
  'events:read',
  'events:own:edit',
  'customers:read',
  'customers:edit',
];
const planningReferentRights = [...auxiliaryRights, 'events:edit'];
const helperRights = [];

const rolesList = [
  {
    _id: new ObjectID(),
    name: 'admin',
    rights: rightsList.map(right => ({
      right_id: right._id,
      hasAccess: true,
    })),
  },
  {
    _id: new ObjectID(),
    name: 'coach',
    rights: rightsList.map(right => ({
      right_id: right._id,
      hasAccess: coachRights.includes(right.permission),
    })),
  },
  {
    _id: new ObjectID(),
    name: 'auxiliary',
    rights: rightsList.map(right => ({
      right_id: right._id,
      hasAccess: auxiliaryRights.includes(right.permission),
    })),
  },
  {
    _id: new ObjectID(),
    name: 'planningReferent',
    rights: rightsList.map(right => ({
      right_id: right._id,
      hasAccess: planningReferentRights.includes(right.permission),
    })),
  },
  {
    _id: new ObjectID(),
    name: 'helper',
    rights: rightsList.map(right => ({
      right_id: right._id,
      hasAccess: helperRights.includes(right.permission),
    })),
  },
];

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
};

const userList = [
  {
    _id: new ObjectID(),
    identity: { firstname: 'Admin', lastname: 'Chef' },
    refreshToken: uuidv4(),
    local: { email: 'admin@alenvi.io', password: '123456' },
    role: rolesList.find(role => role.name === 'admin')._id,
    company: authCompany._id,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Coach', lastname: 'Calif' },
    local: { email: 'coach@alenvi.io', password: '123456' },
    refreshToken: uuidv4(),
    role: rolesList.find(role => role.name === 'coach')._id,
    company: authCompany._id,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Auxiliary', lastname: 'Test' },
    local: { email: 'auxiliary@alenvi.io', password: '123456' },
    refreshToken: uuidv4(),
    role: rolesList.find(role => role.name === 'auxiliary')._id,
    company: authCompany._id,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'PlanningReferent', lastname: 'Test' },
    local: { email: 'planning-referent@alenvi.io', password: '123456' },
    refreshToken: uuidv4(),
    role: rolesList.find(role => role.name === 'planningReferent')._id,
    company: authCompany._id,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Helper', lastname: 'Test' },
    local: { email: 'helper@alenvi.io', password: '123456' },
    refreshToken: uuidv4(),
    role: rolesList.find(role => role.name === 'helper')._id,
    company: authCompany._id,
  },
];

const populateDBForAuthentication = async () => {
  await Role.deleteMany({});
  await Right.deleteMany({});
  await User.deleteMany({});
  await Company.deleteMany({});
  await new Company(authCompany).save();
  await new Company(otherCompany).save();
  await Right.insertMany(rightsList);
  await Role.insertMany(rolesList);
  for (let i = 0; i < userList.length; i++) {
    await (new User(userList[i]).save());
  }
};

const getUser = (roleName, list = userList) => {
  const role = rolesList.find(r => r.name === roleName);
  return list.find(u => u.role.toHexString() === role._id.toHexString());
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
