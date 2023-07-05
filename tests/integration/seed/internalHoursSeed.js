const { ObjectId } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const InternalHour = require('../../../src/models/InternalHour');
const User = require('../../../src/models/User');
const Event = require('../../../src/models/Event');
const { authCompany, otherCompany, companyWithoutSubscription } = require('../../seed/authCompaniesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/db');
const { userList } = require('../../seed/authUsersSeed');
const { INTERNAL_HOUR, WEBAPP } = require('../../../src/helpers/constants');
const UserCompany = require('../../../src/models/UserCompany');
const { clientAdminRoleId, auxiliaryRoleId } = require('../../seed/authRolesSeed');

const internalHourUsers = [{
  _id: new ObjectId(),
  identity: { firstname: 'Admin', lastname: 'Chef' },
  refreshToken: uuidv4(),
  local: { email: 'admin_internal_hour@alenvi.io', password: '123456!eR' },
  role: { client: clientAdminRoleId },
  origin: WEBAPP,
}, {
  _id: new ObjectId(),
  identity: { firstname: 'internal', lastname: 'Test' },
  local: { email: 'auxiliary_internal_hour@alenvi.io' },
  refreshToken: uuidv4(),
  role: { client: auxiliaryRoleId },
  origin: WEBAPP,
}];

const internalHourUserCompanies = [
  // old inactive user company
  {
    _id: new ObjectId(),
    user: internalHourUsers[0]._id,
    company: companyWithoutSubscription._id,
    startDate: '2022-01-01T23:00:00.000Z',
    endDate: '2022-11-30T23:00:00.000Z',
  },
  { _id: new ObjectId(), user: internalHourUsers[0]._id, company: otherCompany._id },
  { _id: new ObjectId(), user: internalHourUsers[1]._id, company: otherCompany._id },
];

const authInternalHoursList = [
  { _id: new ObjectId(), name: 'Planning', company: authCompany._id },
  { _id: new ObjectId(), name: 'Intégration', company: authCompany._id },
  { _id: new ObjectId(), name: 'Réunion', company: authCompany._id },
  { _id: new ObjectId(), name: 'Visite', company: authCompany._id },
  { _id: new ObjectId(), name: 'Prospection', company: authCompany._id },
  { _id: new ObjectId(), name: 'Recrutement', company: authCompany._id },
  { _id: new ObjectId(), name: 'Formation', company: authCompany._id },
  { _id: new ObjectId(), name: 'Autre', company: authCompany._id },
];

const internalHoursList = [
  { _id: new ObjectId(), name: 'Tutu', company: otherCompany._id },
  { _id: new ObjectId(), name: 'Toto', company: otherCompany._id },
  { _id: new ObjectId(), name: 'Tata', company: otherCompany._id },
  { _id: new ObjectId(), name: 'Titi', company: otherCompany._id },
];

const eventList = [
  {
    _id: new ObjectId(),
    type: INTERNAL_HOUR,
    company: authCompany._id,
    startDate: '2019-01-16T09:00:00.543Z',
    endDate: '2019-01-16T10:00:00.653Z',
    auxiliary: userList[2]._id,
    internalHour: authInternalHoursList[0]._id,
  },
  {
    _id: new ObjectId(),
    type: INTERNAL_HOUR,
    company: otherCompany._id,
    startDate: '2019-01-16T09:00:00.543Z',
    endDate: '2019-01-16T10:00:00.653Z',
    auxiliary: internalHourUsers[0]._id,
    internalHour: internalHoursList[0]._id,
  },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    Event.create(eventList),
    InternalHour.create([...internalHoursList, ...authInternalHoursList]),
    User.create(internalHourUsers),
    UserCompany.create(internalHourUserCompanies),
  ]);
};

module.exports = {
  populateDB,
  internalHoursList,
  authInternalHoursList,
  internalHourUsers,
  eventList,
};
