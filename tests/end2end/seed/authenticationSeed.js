const Company = require('../../../src/models/Company');
const Right = require('../../../src/models/Right');
const Role = require('../../../src/models/Role');
const User = require('../../../src/models/User');
const Customer = require('../../../src/models/Customer');
const ThirdPartyPayer = require('../../../src/models/ThirdPartyPayer');
const Service = require('../../../src/models/Service');
const { authCompany } = require('../../seed/companySeed');
const { rolesList, rightsList } = require('../../seed/roleSeed');
const { userList } = require('../../seed/userSeed');
const { customerList } = require('../../seed/customerSeed');
const { serviceList } = require('../../seed/serviceSeed');
const { thirdPartyPayerList } = require('../../seed/thirdPartyPayerSeed');

const populateAuthentication = async () => {
  await Company.deleteMany({});
  await Right.deleteMany({});
  await Role.deleteMany({});
  await User.deleteMany({});
  await Customer.deleteMany({});
  await ThirdPartyPayer.deleteMany({});
  await Service.deleteMany({});

  await new Company(authCompany).save();
  await Right.insertMany(rightsList);
  await Role.insertMany(rolesList);
  await ThirdPartyPayer.insertMany(thirdPartyPayerList);
  await Service.insertMany(serviceList);
  for (let i = 0; i < userList.length; i++) {
    await (new User(userList[i])).save();
  }
  for (let i = 0; i < customerList.length; i++) {
    await (new Customer(customerList[i])).save();
  }
};

module.exports = { populateAuthentication };
