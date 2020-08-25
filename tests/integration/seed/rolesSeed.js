const { ObjectID } = require('mongodb');
const { populateDBForAuthentication } = require('./authenticationSeed');
const Role = require('../../../src/models/Role');

const rolesList = [
  {
    _id: new ObjectID(),
    name: 'general',
    interface: 'client',
  },
  {
    _id: new ObjectID(),
    name: 'chef',
    interface: 'client',
  },
  {
    _id: new ObjectID(),
    name: 'adjudant',
    interface: 'client',
  },
];

const rolePayload = {
  name: 'Test',
  interface: 'client',

};

const populateDB = async () => {
  await Role.deleteMany({});

  await populateDBForAuthentication();
  await Role.insertMany(rolesList);
};

module.exports = {
  rolesList,
  populateDB,
  rolePayload,
};
