const { ObjectID } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const { WEBAPP } = require('../../../src/helpers/constants');
const User = require('../../../src/models/User');
const UserCompany = require('../../../src/models/UserCompany');
const { populateDBForAuthentication, rolesList, otherCompany, authCompany } = require('./authenticationSeed');

const smsUser = {
  _id: new ObjectID(),
  identity: { firstname: 'emailUser', lastname: 'Test' },
  local: { email: 'email_user@alenvi.io', password: '123456!eR' },
  contact: { phone: '0987654321' },
  refreshToken: uuidv4(),
  role: { client: rolesList.find(role => role.name === 'client_admin')._id },
  origin: WEBAPP,
};

const smsUserFromOtherCompany = {
  _id: new ObjectID(),
  identity: { firstname: 'emailUser', lastname: 'Test' },
  local: { email: 'email_user_other_company@alenvi.io', password: '123456!eR' },
  contact: { phone: '0253647382' },
  refreshToken: uuidv4(),
  role: { client: rolesList.find(role => role.name === 'client_admin')._id },
  origin: WEBAPP,
};

const userCompanies = [
  { _id: new ObjectID(), user: smsUser._id, company: authCompany._id },
  { _id: new ObjectID(), user: smsUserFromOtherCompany._id, company: otherCompany._id },
];

const populateDB = async () => {
  await User.deleteMany();
  await UserCompany.deleteMany();

  await populateDBForAuthentication();
  await new User(smsUser).save();
  await new User(smsUserFromOtherCompany).save();
  await UserCompany.insertMany(userCompanies);
};

module.exports = { populateDB, smsUser, smsUserFromOtherCompany };
