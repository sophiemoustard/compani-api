const Company = require('../../../src/models/Company');
const Right = require('../../../src/models/Right');
const Role = require('../../../src/models/Role');
const Service = require('../../../src/models/Service');
const Event = require('../../../src/models/Event');
const User = require('../../../src/models/User');
const Customer = require('../../../src/models/Customer');
const Bill = require('../../../src/models/Bill');
const ThirdPartyPayer = require('../../../src/models/ThirdPartyPayer');
const { authCompany } = require('../../seed/companySeed');
const { rolesList, rightsList } = require('../../seed/roleSeed');
const { serviceList } = require('../../seed/serviceSeed');
const { eventList } = require('../../seed/eventSeed');
const { userList } = require('../../seed/userSeed');
const { customerList } = require('../../seed/customerSeed');
const { billList } = require('../../seed/billSeed');
const { thirdPartyPayerList } = require('../../seed/thirdPartyPayerSeed');

const seedDb = async () => {
  await Company.deleteMany({});
  await Right.deleteMany({});
  await Role.deleteMany({});
  await Service.deleteMany({});
  await Event.deleteMany({});
  await User.deleteMany({});
  await Customer.deleteMany({});
  await ThirdPartyPayer.deleteMany({});
  await Bill.deleteMany({});

  await new Company(authCompany).save();
  await Right.insertMany(rightsList);
  await Role.insertMany(rolesList);
  await Service.insertMany(serviceList);
  await Event.insertMany(eventList);
  await Bill.insertMany(billList);
  await ThirdPartyPayer.insertMany(thirdPartyPayerList);
  for (let i = 0; i < userList.length; i++) {
    await (new User(userList[i])).save();
  }
  for (let i = 0; i < customerList.length; i++) {
    await (new Customer(customerList[i])).save();
  }
};

module.exports = { seedDb };
