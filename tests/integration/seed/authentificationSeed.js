const { ObjectID } = require('mongodb');
const uuidv4 = require('uuid/v4');
const memoize = require('lodash/memoize');
const Role = require('../../../models/Role');
const Right = require('../../../models/Right');
const User = require('../../../models/User');
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
    permission: 'billing:edit',
  },
  {
    _id: new ObjectID(),
    description: 'Read billing info',
    permission: 'billing:read',
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
    description: 'Consulter sa liste de contrats',
    permission: 'contracts:read',
  },
  {
    _id: new ObjectID(),
    description: 'Consulter la liste de contrats des autres utilisateurs',
    permission: 'contracts:read:user',
  },
  {
    _id: new ObjectID(),
    description: 'Editer la liste de contrats des autres utilisateurs',
    permission: 'contracts:edit:user',
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
    description: 'Editer un évènement de son secteur',
    permission: 'events:sector:edit',
    name: 'events-sector-edit',
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
];

const coachRights = [
  'config:read',
  'billing:read',
  'pay:read',
  'contracts:read',
  'contracts:read:user',
  'contracts:edit:user',
  'exports:read',
  'users:list',
  'users:edit',
  'events:edit',
  'events:read',
  'customers:create',
  'customers:read',
  'customers:edit',
  'customers:administrative:edit',
];
const auxiliaryRights = ['config:read', 'pay:read', 'contracts:read', 'users:list', 'events:read', 'events:own:edit', 'customers:read', 'customers:edit'];
const planningReferentRights = [...auxiliaryRights, 'events:sector:edit'];
const helperRights = ['billing:read'];

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

const userList = [
  {
    _id: new ObjectID(),
    identity: { firstname: 'Admin', lastname: 'Chef' },
    refreshToken: uuidv4(),
    local: { email: 'admin@alenvi.io', password: '123456' },
    role: rolesList.find(role => role.name === 'admin')._id,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Coach', lastname: 'Calif' },
    local: { email: 'coach@alenvi.io', password: '123456' },
    refreshToken: uuidv4(),
    role: rolesList.find(role => role.name === 'coach')._id,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Auxiliary', lastname: 'Test' },
    local: { email: 'auxiliary@alenvi.io', password: '123456' },
    refreshToken: uuidv4(),
    role: rolesList.find(role => role.name === 'auxiliary')._id,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'PlanningReferent', lastname: 'Test' },
    local: { email: 'planning-referent@alenvi.io', password: '123456' },
    refreshToken: uuidv4(),
    role: rolesList.find(role => role.name === 'planningReferent')._id,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Helper', lastname: 'Test' },
    local: { email: 'helper@alenvi.io', password: '123456' },
    refreshToken: uuidv4(),
    role: rolesList.find(role => role.name === 'helper')._id,
    customers: [new ObjectID('5d7101633a0366169cf3bc1c')],
  },
];

const populateDBForAuthentification = async () => {
  await Role.deleteMany({});
  await Right.deleteMany({});
  await User.deleteMany({});
  await Right.insertMany(rightsList);
  await Role.insertMany(rolesList);
  for (let i = 0; i < userList.length; i++) {
    await (new User(userList[i]).save());
  }
};

const getUser = (roleName) => {
  const role = rolesList.find(r => r.name === roleName);
  return userList.find(u => u.role.toHexString() === role._id.toHexString());
};

const getToken = memoize(async (roleName) => {
  const user = getUser(roleName);
  const response = await app.inject({
    method: 'POST',
    url: '/users/authenticate',
    payload: user.local,
  });

  return response.result.data.token;
});

module.exports = {
  rolesList,
  rightsList,
  userList,
  populateDBForAuthentification,
  getUser,
  getToken,
};
