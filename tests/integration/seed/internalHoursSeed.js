const { ObjectID } = require('mongodb');
const uuidv4 = require('uuid/v4');
const InternalHour = require('../../../src/models/InternalHour');
const Company = require('../../../src/models/Company');
const User = require('../../../src/models/User');
const Event = require('../../../src/models/Event');
const { populateDBForAuthentication, authCompany, rolesList } = require('./authenticationSeed');

const internalHoursCompany = {
  _id: new ObjectID(),
  name: 'Test SARL',
  tradeName: 'TT',
  customersConfig: {
    billingPeriod: 'two_weeks',
  },
  folderId: '0987654321',
  directDebitsFolderId: '1234567890',
  customersFolderId: 'mnbvcxz',
  auxiliariesFolderId: 'kjhggfd',
  prefixNumber: 103,
};

const internalHourUsers = [{
  _id: new ObjectID(),
  identity: { firstname: 'Admin', lastname: 'Chef' },
  refreshToken: uuidv4(),
  local: { email: 'admin_internal_hour@alenvi.io', password: '123456' },
  role: rolesList.find(role => role.name === 'adminClient')._id,
  company: internalHoursCompany._id,
}, {
  _id: new ObjectID(),
  identity: { firstname: 'Auxiliary', lastname: 'Test' },
  local: { email: 'auxiliary_internal_hour@alenvi.io', password: '123456' },
  refreshToken: uuidv4(),
  role: rolesList.find(role => role.name === 'auxiliary')._id,
  company: internalHoursCompany._id,
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
  { default: true, _id: new ObjectID(), name: 'Tutu', company: internalHoursCompany._id },
  { default: false, _id: new ObjectID(), name: 'Toto', company: internalHoursCompany._id },
  { default: false, _id: new ObjectID(), name: 'Tata', company: internalHoursCompany._id },
  { default: false, _id: new ObjectID(), name: 'Titi', company: internalHoursCompany._id },
];

const internalHourEventsList = [
  {
    _id: new ObjectID(),
    type: 'internalHour',
    startDate: '2019-01-17T10:30:18.653Z',
    endDate: '2019-01-17T12:00:18.653Z',
    auxiliary: internalHourUsers[1]._id,
    createdAt: '2019-01-05T15:24:18.653Z',
    internalHour: internalHoursList[0]._id,
  }, {
    _id: new ObjectID(),
    type: 'internalHour',
    startDate: '2019-01-17T10:30:18.653Z',
    endDate: '2019-01-17T12:00:18.653Z',
    auxiliary: internalHourUsers[1]._id,
    createdAt: '2019-01-05T15:24:18.653Z',
    internalHour: internalHoursList[1]._id,
  },
];

const populateDB = async () => {
  await InternalHour.deleteMany({});
  await Event.deleteMany({});

  await populateDBForAuthentication();
  await InternalHour.insertMany([...internalHoursList, ...authInternalHoursList]);
  await (new Company(internalHoursCompany)).save();
  await User.create(internalHourUsers);
};

module.exports = {
  populateDB,
  internalHoursList,
  authInternalHoursList,
  internalHourUsers,
  internalHourEventsList,
  internalHoursCompany,
};
