const { ObjectID } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const InternalHour = require('../../../src/models/InternalHour');
const User = require('../../../src/models/User');
const Event = require('../../../src/models/Event');
const { populateDBForAuthentication, authCompany, rolesList, otherCompany } = require('./authenticationSeed');
const { userList } = require('../../seed/userSeed');

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
  { _id: new ObjectID(), name: 'Planning', company: authCompany._id },
  { _id: new ObjectID(), name: 'Intégration', company: authCompany._id },
  { _id: new ObjectID(), name: 'Réunion', company: authCompany._id },
  { _id: new ObjectID(), name: 'Visite', company: authCompany._id },
  { _id: new ObjectID(), name: 'Prospection', company: authCompany._id },
  { _id: new ObjectID(), name: 'Recrutement', company: authCompany._id },
  { _id: new ObjectID(), name: 'Formation', company: authCompany._id },
  { _id: new ObjectID(), name: 'Autre', company: authCompany._id },
];

const internalHoursList = [
  { _id: new ObjectID(), name: 'Tutu', company: otherCompany._id },
  { _id: new ObjectID(), name: 'Toto', company: otherCompany._id },
  { _id: new ObjectID(), name: 'Tata', company: otherCompany._id },
  { _id: new ObjectID(), name: 'Titi', company: otherCompany._id },
];

const eventList = [
  {
    _id: new ObjectID(),
    type: 'internalHour',
    company: authCompany._id,
    startDate: '2019-01-16T09:00:00.543Z',
    endDate: '2019-01-16T10:00:00.653Z',
    auxiliary: userList[2]._id,
    internalHour: authInternalHoursList[0]._id,
  },
  {
    _id: new ObjectID(),
    type: 'internalHour',
    company: otherCompany._id,
    startDate: '2019-01-16T09:00:00.543Z',
    endDate: '2019-01-16T10:00:00.653Z',
    auxiliary: internalHourUsers[0]._id,
    internalHour: internalHoursList[0]._id,
  },
];

const populateDB = async () => {
  await InternalHour.deleteMany({});
  await Event.deleteMany({});

  await populateDBForAuthentication();

  await Event.insertMany(eventList);
  await InternalHour.insertMany([...internalHoursList, ...authInternalHoursList]);
  await User.create(internalHourUsers);
};

module.exports = {
  populateDB,
  internalHoursList,
  authInternalHoursList,
  internalHourUsers,
  eventList,
};
