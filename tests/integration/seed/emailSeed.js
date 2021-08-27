const { ObjectID } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const { WEBAPP } = require('../../../src/helpers/constants');
const User = require('../../../src/models/User');
const UserCompany = require('../../../src/models/UserCompany');
const { otherCompany, authCompany } = require('../../seed/authCompaniesSeed');
const { clientAdminRoleId, trainerRoleId, helperRoleId, coachRoleId } = require('../../seed/authRolesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');

const emailUser = {
  _id: new ObjectID(),
  identity: { firstname: 'emailUser', lastname: 'Test' },
  local: { email: 'email_user@alenvi.io' },
  refreshToken: uuidv4(),
  role: { client: clientAdminRoleId },
  origin: WEBAPP,
};

const emailUserFromOtherCompany = {
  _id: new ObjectID(),
  identity: { firstname: 'otherCompany', lastname: 'Test' },
  local: { email: 'email_user_other_company@alenvi.io', password: '123456!eR' },
  refreshToken: uuidv4(),
  role: { client: clientAdminRoleId },
  origin: WEBAPP,
};

const coachFromOtherCompany = {
  _id: new ObjectID(),
  identity: { firstname: 'coach', lastname: 'Test' },
  local: { email: 'coach_email_user@alenvi.io', password: '123456!eR' },
  refreshToken: uuidv4(),
  role: { client: coachRoleId },
  origin: WEBAPP,
};

const trainerFromOtherCompany = {
  _id: new ObjectID(),
  identity: { firstname: 'trainer', lastname: 'Test' },
  local: { email: 'trainer_email_other_company@alenvi.io' },
  refreshToken: uuidv4(),
  role: { vendor: trainerRoleId },
  origin: WEBAPP,
};

const helperFromOtherCompany = {
  _id: new ObjectID(),
  identity: { firstname: 'helper', lastname: 'Test' },
  local: { email: 'helper_email_user@alenvi.io', password: '123456!eR' },
  refreshToken: uuidv4(),
  role: { client: helperRoleId },
  origin: WEBAPP,
};

const emailUsers = [
  emailUser,
  emailUserFromOtherCompany,
  trainerFromOtherCompany,
  helperFromOtherCompany,
  coachFromOtherCompany,
];

const userCompanies = [
  { _id: new ObjectID(), user: emailUser._id, company: authCompany._id },
  { _id: new ObjectID(), user: emailUserFromOtherCompany._id, company: otherCompany._id },
  { _id: new ObjectID(), user: trainerFromOtherCompany._id, company: otherCompany._id },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    User.create(emailUsers),
    UserCompany.create(userCompanies),
  ]);
};

module.exports = {
  populateDB,
  emailUser,
  emailUserFromOtherCompany,
  trainerFromOtherCompany,
  helperFromOtherCompany,
  coachFromOtherCompany,
};
