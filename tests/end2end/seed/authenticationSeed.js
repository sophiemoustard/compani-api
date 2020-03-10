const { ObjectID } = require('mongodb');
const uuidv4 = require('uuid/v4');
const Role = require('../../../src/models/Role');
const Right = require('../../../src/models/Right');
const User = require('../../../src/models/User');
const Company = require('../../../src/models/Company');
const { CLIENT_ADMIN } = require('../../../src/helpers/constants');
const { rolesList, rightsList } = require('../../seed/roleSeed');

const authCompany = {
  _id: new ObjectID(),
  name: 'Test SAS',
  tradeName: 'Test',
  prefixNumber: 101,
  iban: '1234',
  bic: '5678',
  ics: '9876',
  folderId: '0987654321',
  directDebitsFolderId: '1234567890',
  customersFolderId: 'mnbvcxz',
  auxiliariesFolderId: 'iuytre',
  customersConfig: {
    billingPeriod: 'two_weeks',
  },
};

const userList = [
  {
    _id: new ObjectID(),
    identity: { firstname: 'client_admin', lastname: 'Chef' },
    refreshToken: uuidv4(),
    local: { email: 'admin@alenvi.io', password: '123456' },
    role: { client: rolesList.find(role => role.name === CLIENT_ADMIN)._id },
    company: authCompany._id,
  },
];

const seedDb = async () => {
  await Role.deleteMany({});
  await Right.deleteMany({});
  await User.deleteMany({});
  await Company.deleteMany({});

  await new Company(authCompany).save();
  await Right.insertMany(rightsList);
  await Role.insertMany(rolesList);
  for (let i = 0; i < userList.length; i++) {
    await (new User(userList[i])).save();
  }
};

module.exports = { seedDb };
