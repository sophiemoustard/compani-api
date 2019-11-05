const { ObjectID } = require('mongodb');
const uuidv4 = require('uuid/v4');
const User = require('../../../src/models/User');
const Company = require('../../../src/models/Company');
const { populateDBForAuthentication, rolesList } = require('./authenticationSeed');

const emailCompany = {
  _id: new ObjectID(),
  name: 'Autretest SA',
  tradeName: 'Autretest',
};

const emailUser = {
  _id: new ObjectID(),
  identity: { firstname: 'HelperForCustomer', lastname: 'Test' },
  local: { email: 'helper_for_customer_creditnote@alenvi.io', password: '123456' },
  refreshToken: uuidv4(),
  role: rolesList.find(role => role.name === 'admin')._id,
  company: emailCompany._id,
};

const populateDB = async () => {
  await Company.deleteMany({});
  await User.deleteMany({});

  await populateDBForAuthentication();
  await new Company(emailCompany).save();
  await new User(emailUser).save();
};

module.exports = { populateDB, emailUser, emailCompany };
