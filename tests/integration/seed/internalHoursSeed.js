const { ObjectID } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const InternalHour = require('../../../src/models/InternalHour');
const User = require('../../../src/models/User');
const Event = require('../../../src/models/Event');
const { populateDBForAuthentication, authCompany, rolesList, otherCompany } = require('./authenticationSeed');

const internalHourUsers = [{
  _id: new ObjectID(),
  identity: { firstname: 'Admin', lastname: 'Chef' },
  refreshToken: uuidv4(),
  local: { email: 'admin_internal_hour@alenvi.io', password: '123456!eR' },
  role: { client: rolesList.find(role => role.name === 'client_admin')._id },
  company: otherCompany._id,
}, {
  _id: new ObjectID(),
  identity: { firstname: 'internal', lastname: 'Test' },
  local: { email: 'auxiliary_internal_hour@alenvi.io', password: '123456!eR' },
  refreshToken: uuidv4(),
  role: { client: rolesList.find(role => role.name === 'auxiliary')._id },
  company: otherCompany._id,
}];

const authInternalHoursList = [
  { default: true, _id: new ObjectID(), name: 'Planning', company: authCompany._id },
  { default: false, _id: new ObjectID(), name: 'Intégration', company: authCompany._id },
  { default: false, _id: new ObjectID(), name: 'Réunion', company: authCompany._id },
  { default: false, _id: new ObjectID(), name: 'Visite', company: authCompany._id },
  { default: false, _id: new ObjectID(), name: 'Prospection', company: authCompany._id },
  { default: false, _id: new ObjectID(), name: 'Recrutement', company: authCompany._id },
  { default: false, _id: new ObjectID(), name: 'Formation', company: authCompany._id },
  { default: false, _id: new ObjectID(), name: 'Autre', company: authCompany._id },
];

const internalHoursList = [
  { default: true, _id: new ObjectID(), name: 'Tutu', company: otherCompany._id },
  { default: false, _id: new ObjectID(), name: 'Toto', company: otherCompany._id },
  { default: false, _id: new ObjectID(), name: 'Tata', company: otherCompany._id },
  { default: false, _id: new ObjectID(), name: 'Titi', company: otherCompany._id },
];

const populateDB = async () => {
  await InternalHour.deleteMany({});
  await Event.deleteMany({});

  await populateDBForAuthentication();

  await InternalHour.insertMany([...internalHoursList, ...authInternalHoursList]);
  await User.create(internalHourUsers);
};

module.exports = {
  populateDB,
  internalHoursList,
  authInternalHoursList,
  internalHourUsers,
};
