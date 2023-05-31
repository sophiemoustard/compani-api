const Company = require('../../../src/models/Company');
const Role = require('../../../src/models/Role');
const User = require('../../../src/models/User');
const UserCompany = require('../../../src/models/UserCompany');
const { authCompany } = require('../../seed/authCompaniesSeed');
const { rolesList } = require('../../seed/authRolesSeed');
const { userList, userCompaniesList } = require('../../seed/authUsersSeed');
const { deleteNonAuthenticationSeeds } = require('../../integration/helpers/db');

const populateAuthentication = async () => {
  await Company.deleteMany();
  await Role.deleteMany();
  await User.deleteMany();
  await UserCompany.deleteMany();

  await deleteNonAuthenticationSeeds();

  await new Company(authCompany).save();
  await Role.insertMany(rolesList);
  for (const user of userList) {
    await (new User(user)).save();
  }
  await UserCompany.insertMany(userCompaniesList);
};

module.exports = { populateAuthentication };
