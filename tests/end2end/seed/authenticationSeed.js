const Role = require('../../../src/models/Role');
const Right = require('../../../src/models/Right');
const User = require('../../../src/models/User');
const Company = require('../../../src/models/Company');
const Customer = require('../../../src/models/Customer');
const { rolesList, rightsList } = require('../../seed/roleSeed');
const { userList } = require('../../seed/userSeed');
const { authCompany } = require('../../seed/companySeed');
const { customerList } = require('../../seed/customerSeed');

const seedDb = async () => {
  await Role.deleteMany({});
  await Right.deleteMany({});
  await User.deleteMany({});
  await Company.deleteMany({});
  await Customer.deleteMany({});

  await new Company(authCompany).save();
  await Right.insertMany(rightsList);
  await Role.insertMany(rolesList);
  for (let i = 0; i < userList.length; i++) {
    await (new User(userList[i])).save();
  }
  for (let i = 0; i < customerList.length; i++) {
    await (new Customer(customerList[i])).save();
  }
};

module.exports = { seedDb };
