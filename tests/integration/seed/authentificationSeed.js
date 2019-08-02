const { ObjectID } = require('mongodb');
const uuidv4 = require('uuid/v4');
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
];

const coachRights = [
  'config:read',
  'billing:read',
  'pay:read',
  'contracts:read',
  'contracts:read:user',
  'contracts:edit:user',
];
const auxiliaryRights = ['pay:read', 'contracts:read'];
const helperRights = ['billing:read'];

const rolesList = [
  {
    _id: new ObjectID('5d3b11e7fecdbd276adef518'),
    name: 'admin',
    rights: rightsList.map(right => ({
      right_id: right._id,
      hasAccess: true,
    })),
  },
  {
    _id: new ObjectID('5d3b11e7fecdbd276adef51a'),
    name: 'coach',
    rights: rightsList.map(right => ({
      right_id: right._id,
      hasAccess: coachRights.includes(right.permission),
    })),
  },
  {
    _id: new ObjectID('5d3b117847536e273565e123'),
    name: 'auxiliary',
    rights: rightsList.map(right => ({
      right_id: right._id,
      hasAccess: auxiliaryRights.includes(right.permission),
    })),
  },
  {
    _id: new ObjectID('5d3b115b18518827239ed1d0'),
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
    identity: { firstname: 'Helper', lastname: 'Test' },
    local: { email: 'helper@alenvi.io', password: '123456' },
    refreshToken: uuidv4(),
    role: rolesList.find(role => role.name === 'helper')._id,
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

const getToken = async (roleName) => {
  const user = getUser(roleName);
  const response = await app.inject({
    method: 'POST',
    url: '/users/authenticate',
    payload: user.local,
  });

  return response.result.data.token;
};

module.exports = {
  rolesList,
  rightsList,
  userList,
  populateDBForAuthentification,
  getUser,
  getToken,
};
