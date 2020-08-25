const Company = require('../../../src/models/Company');
const Role = require('../../../src/models/Role');
const User = require('../../../src/models/User');
const { authCompany } = require('../../seed/companySeed');
const { rolesList } = require('../../seed/roleSeed');
const { userList } = require('../../seed/userSeed');

const populateAuthentication = async () => {
  await Company.deleteMany({});
  await Role.deleteMany({});
  await User.deleteMany({});

  await new Company(authCompany).save();
  await Role.insertMany(rolesList);
  for (const user of userList) {
    await (new User(user)).save();
  }
};

module.exports = { populateAuthentication };
