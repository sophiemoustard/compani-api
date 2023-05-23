const { ObjectId } = require('mongodb');
const Role = require('../../../src/models/Role');
const { deleteNonAuthenticationSeeds } = require('../helpers/db');

const rolesList = [
  { _id: new ObjectId(), name: 'general', interface: 'client' },
  { _id: new ObjectId(), name: 'chef', interface: 'client' },
  { _id: new ObjectId(), name: 'adjudant', interface: 'client' },
];

const rolePayload = { name: 'Test', interface: 'client' };

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([Role.create(rolesList)]);
};

module.exports = {
  rolesList,
  populateDB,
  rolePayload,
};
