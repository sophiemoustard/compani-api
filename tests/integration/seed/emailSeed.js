const { ObjectID } = require('mongodb');
const uuidv4 = require('uuid/v4');
const User = require('../../../src/models/User');
const { populateDBForAuthentication, rolesList, otherCompany, authCompany } = require('./authenticationSeed');

const emailUser = {
  _id: new ObjectID(),
  identity: { firstname: 'emailUser', lastname: 'Test' },
  local: { email: 'email_user@alenvi.io', password: '123456' },
  refreshToken: uuidv4(),
  role: rolesList.find(role => role.name === 'admin_client')._id,
  company: authCompany._id,
};

const emailUserFromOtherCompany = {
  _id: new ObjectID(),
  identity: { firstname: 'emailUser', lastname: 'Test' },
  local: { email: 'email_user_other_company@alenvi.io', password: '123456' },
  refreshToken: uuidv4(),
  role: rolesList.find(role => role.name === 'admin_client')._id,
  company: otherCompany._id,
};

const populateDB = async () => {
  await User.deleteMany({});
  await populateDBForAuthentication();
  await new User(emailUser).save();
  await new User(emailUserFromOtherCompany).save();
};

module.exports = { populateDB, emailUser, emailUserFromOtherCompany };
