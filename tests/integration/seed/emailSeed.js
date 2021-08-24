const { ObjectID } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const { WEBAPP } = require('../../../src/helpers/constants');
const User = require('../../../src/models/User');
const UserCompany = require('../../../src/models/UserCompany');
const { rolesList, otherCompany, authCompany } = require('./authenticationSeed');
const { deleteNonAuthenticationSeeds } = require('./initializeDB');

const emailUser = {
  _id: new ObjectID(),
  identity: { firstname: 'emailUser', lastname: 'Test' },
  local: { email: 'email_user@alenvi.io', password: '123456!eR' },
  refreshToken: uuidv4(),
  role: { client: rolesList.find(role => role.name === 'client_admin')._id },
  origin: WEBAPP,
};

const emailUserFromOtherCompany = {
  _id: new ObjectID(),
  identity: { firstname: 'otherCompany', lastname: 'Test' },
  local: { email: 'email_user_other_company@alenvi.io', password: '123456!eR' },
  refreshToken: uuidv4(),
  role: { client: rolesList.find(role => role.name === 'client_admin')._id },
  origin: WEBAPP,
};

const trainerFromOtherCompany = {
  _id: new ObjectID(),
  identity: { firstname: 'trainer', lastname: 'Test' },
  local: { email: 'trainer_email_other_company@alenvi.io', password: '123456!eR' },
  refreshToken: uuidv4(),
  role: { vendor: rolesList.find(role => role.name === 'trainer')._id },
  origin: WEBAPP,
};

const userCompanies = [
  { _id: new ObjectID(), user: emailUser._id, company: authCompany._id },
  { _id: new ObjectID(), user: emailUserFromOtherCompany._id, company: otherCompany._id },
  { _id: new ObjectID(), user: trainerFromOtherCompany._id, company: otherCompany._id },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await User.create(emailUser, emailUserFromOtherCompany, trainerFromOtherCompany);
  await UserCompany.insertMany(userCompanies);
};

module.exports = { populateDB, emailUser, emailUserFromOtherCompany, trainerFromOtherCompany };
