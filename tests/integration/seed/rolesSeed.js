const { ObjectID } = require('mongodb');
const Role = require('../../../src/models/Role');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');

const rolesList = [
  { _id: new ObjectID(), name: 'general', interface: 'client' },
  { _id: new ObjectID(), name: 'chef', interface: 'client' },
  { _id: new ObjectID(), name: 'adjudant', interface: 'client' },
];

const rolePayload = { name: 'Test', interface: 'client' };

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Role.insertMany(rolesList);
};

module.exports = {
  rolesList,
  populateDB,
  rolePayload,
};
