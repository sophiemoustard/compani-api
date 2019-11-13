const { ObjectID } = require('mongodb');
const uuidv4 = require('uuid/v4');
const InternalHour = require('../../../src/models/InternalHour');
const Company = require('../../../src/models/Company');
const User = require('../../../src/models/User');
const { populateDBForAuthentication, authCompany, rolesList } = require('./authenticationSeed');

const internalHoursCompany = {
  _id: new ObjectID(),
  name: 'Test SARL',
  tradeName: 'TT',
};

const internalHourUser = {
  _id: new ObjectID(),
  identity: { firstname: 'Admin', lastname: 'Chef' },
  refreshToken: uuidv4(),
  local: { email: 'admin_internal_hour@alenvi.io', password: '123456' },
  role: rolesList.find(role => role.name === 'admin')._id,
  company: internalHoursCompany._id,
};

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
  { default: true, _id: new ObjectID(), name: 'Tutu', company: internalHoursCompany._id },
  { default: false, _id: new ObjectID(), name: 'Toto', company: internalHoursCompany._id },
  { default: false, _id: new ObjectID(), name: 'Tata', company: internalHoursCompany._id },
  { default: false, _id: new ObjectID(), name: 'Titi', company: internalHoursCompany._id },
];

const populateDB = async () => {
  await InternalHour.deleteMany({});

  await populateDBForAuthentication();
  await InternalHour.insertMany([...internalHoursList, ...authInternalHoursList]);
  await (new Company(internalHoursCompany)).save();
  await (new User(internalHourUser)).save();
};

module.exports = {
  populateDB,
  internalHoursList,
  authInternalHoursList,
  internalHourUser,
};
