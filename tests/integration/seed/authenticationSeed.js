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
  CLIENT,
  VENDOR,
  VENDOR_ADMIN,
  CLIENT_ADMIN,
  AUXILIARY,
  HELPER,
  COACH,
  PLANNING_REFERENT,
  AUXILIARY_WITHOUT_COMPANY,
} = require('../../../src/helpers/constants');
const app = require('../../../server');

const rightsList = [
  { _id: new ObjectID(), description: 'Edit config', permission: 'config:edit' },
  { _id: new ObjectID(), description: 'Read config', permission: 'config:read' },
  { _id: new ObjectID(), description: 'Edit billing info', permission: 'bills:edit' },
  { _id: new ObjectID(), description: 'Read billing info', permission: 'bills:read' },
  { _id: new ObjectID(), description: 'Edit payment info', permission: 'payments:edit' },
  { _id: new ObjectID(), description: 'Create payment list', permission: 'payments:list:create' },
  { _id: new ObjectID(), description: 'Edit pay info', permission: 'pay:edit' },
  { _id: new ObjectID(), description: 'Read pay info', permission: 'pay:read' },
  { _id: new ObjectID(), description: 'Editer la liste de contrats', permission: 'contracts:edit' },
  { _id: new ObjectID(), description: 'Exporter des données', permission: 'exports:read' },
  { _id: new ObjectID(), description: 'Lister les utilisateurs', permission: 'users:list', name: 'users-list' },
  { _id: new ObjectID(), description: 'Editer un utilisateur', permission: 'users:edit', name: 'users-edit' },
  { _id: new ObjectID(), description: 'Editer un évènement', permission: 'events:edit', name: 'events-edit' },
  { _id: new ObjectID(), description: 'Consulter les évènements', permission: 'events:read', name: 'events-read' },
  { _id: new ObjectID(), description: 'Editer son évènement', permission: 'events:own:edit', name: 'events-own-edit' },
  { _id: new ObjectID(), description: 'Créer ou supprimer des bénéficiaires', permission: 'customers:create' },
  { _id: new ObjectID(), description: 'Consulter les données de bénéficiaires', permission: 'customers:read' },
  { _id: new ObjectID(), description: 'Editer les données de bénéficiaires', permission: 'customers:edit' },
  {
    _id: new ObjectID(),
    description: 'Editer les données administratives de bénéficiaires',
    permission: 'customers:administrative:edit',
  },
  { _id: new ObjectID(), description: 'Editer les informations de la compagnie', permission: 'companies:edit' },
  { _id: new ObjectID(), description: 'Consulter les roles', permission: 'roles:read' },
  { _id: new ObjectID(), description: 'Editer les documents de paie', permission: 'paydocuments:edit' },
  { _id: new ObjectID(), description: 'Créer une entreprise', permission: 'companies:create' },
  { _id: new ObjectID(), description: 'Consulter les attestions fiscales', permission: 'taxcertificates:read' },
  { _id: new ObjectID(), description: 'Éditer une attestion fiscale', permission: 'taxcertificates:edit' },
  { _id: new ObjectID(), description: 'Editer un établissement', permission: 'establishments:edit' },
  { _id: new ObjectID(), description: 'Consulter la liste des établissements', permission: 'establishments:read' },
  { _id: new ObjectID(), description: 'Consulter la liste des structures', permission: 'companies:read' },
];
const vendorAdminRights = [
  'companies:create',
  'users:edit',
  'users:list',
  'companies:read',
];
const clientAdminRights = [
  'config:edit',
  'config:read',
  'bills:edit',
  'bills:read',
  'payments:edit',
  'payments:list:create',
  'pay:edit',
  'pay:read',
  'contracts:edit',
  'exports:read',
  'users:list',
  'users:edit',
  'events:edit',
  'events:read',
  'events:own:edit',
  'customers:create',
  'customers:read',
  'customers:edit',
  'customers:administrative:edit',
  'companies:edit',
  'roles:read',
  'paydocuments:edit',
  'taxcertificates:read',
  'taxcertificates:edit',
  'establishments:edit',
  'establishments:read',
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
  'taxcertificates:read',
  'taxcertificates:edit',
  'establishments:read',
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
const auxiliaryWithoutCompanyRights = [];

const rolesList = [
  {
    _id: new ObjectID(),
    name: VENDOR_ADMIN,
    interface: VENDOR,
    rights: rightsList.map(right => ({
      right_id: right._id,
      hasAccess: vendorAdminRights.includes(right.permission),
    })),
  },
  {
    _id: new ObjectID(),
    name: CLIENT_ADMIN,
    interface: CLIENT,
    rights: rightsList.map(right => ({
      right_id: right._id,
      hasAccess: clientAdminRights.includes(right.permission),
    })),
  },
  {
    _id: new ObjectID(),
    name: COACH,
    interface: CLIENT,
    rights: rightsList.map(right => ({
      right_id: right._id,
      hasAccess: coachRights.includes(right.permission),
    })),
  },
  {
    _id: new ObjectID(),
    name: AUXILIARY,
    interface: CLIENT,
    rights: rightsList.map(right => ({
      right_id: right._id,
      hasAccess: auxiliaryRights.includes(right.permission),
    })),
  },
  {
    _id: new ObjectID(),
    name: AUXILIARY_WITHOUT_COMPANY,
    interface: CLIENT,
    rights: rightsList.map(right => ({
      right_id: right._id,
      hasAccess: auxiliaryWithoutCompanyRights.includes(right.permission),
    })),
  },
  {
    _id: new ObjectID(),
    name: PLANNING_REFERENT,
    interface: CLIENT,
    rights: rightsList.map(right => ({
      right_id: right._id,
      hasAccess: planningReferentRights.includes(right.permission),
    })),
  },
  {
    _id: new ObjectID(),
    name: HELPER,
    interface: CLIENT,
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
    identity: { firstname: 'Admin', lastname: 'Chef' },
    refreshToken: uuidv4(),
    local: { email: 'admin@alenvi.io', password: '123456' },
    role: { client: rolesList.find(role => role.name === CLIENT_ADMIN)._id },
    company: authCompany._id,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Coach', lastname: 'Calif' },
    local: { email: 'coach@alenvi.io', password: '123456' },
    refreshToken: uuidv4(),
    role: { client: rolesList.find(role => role.name === COACH)._id },
    company: authCompany._id,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Auxiliary', lastname: 'Test', title: 'mr' },
    local: { email: 'auxiliary@alenvi.io', password: '123456' },
    refreshToken: uuidv4(),
    role: { client: rolesList.find(role => role.name === AUXILIARY)._id },
    company: authCompany._id,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Auxiliary without company', lastname: 'Test' },
    local: { email: 'auxiliarywithoutcompany@alenvi.io', password: '123456' },
    refreshToken: uuidv4(),
    role: { client: rolesList.find(role => role.name === AUXILIARY_WITHOUT_COMPANY)._id },
    company: authCompany._id,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'PlanningReferent', lastname: 'Test', title: 'mrs' },
    local: { email: 'planning-referent@alenvi.io', password: '123456' },
    refreshToken: uuidv4(),
    role: { client: rolesList.find(role => role.name === PLANNING_REFERENT)._id },
    company: authCompany._id,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Helper', lastname: 'Test' },
    local: { email: 'helper@alenvi.io', password: '123456' },
    refreshToken: uuidv4(),
    role: { client: rolesList.find(role => role.name === HELPER)._id },
    company: authCompany._id,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'vendor_admin', lastname: 'SuperChef' },
    refreshToken: uuidv4(),
    local: { email: 'super-admin@alenvi.io', password: '123456' },
    role: { vendor: rolesList.find(role => role.name === VENDOR_ADMIN)._id },
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
