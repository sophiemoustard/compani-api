const { ObjectID } = require('mongodb');
const uuidv4 = require('uuid/v4');
const ActivationCode = require('../../../src/models/ActivationCode');
const User = require('../../../src/models/User');
const { rolesList } = require('./authenticationSeed');
const { populateDBForAuthentication, authCompany, otherCompany } = require('./authenticationSeed');

const activationCodeUser = {
  _id: new ObjectID(),
  identity: { firstname: 'Test5', lastname: 'Test5' },
  local: { email: 'test5@alenvi.io', password: '123456!eR' },
  refreshToken: uuidv4(),
  role: { client: rolesList.find(role => role.name === 'coach')._id },
  inactivityDate: '2018-11-01T12:52:27.461Z',
  isConfirmed: false,
  company: authCompany._id,
};

const userFromOtherCompany = {
  _id: new ObjectID(),
  identity: { firstname: 'other', lastname: 'company' },
  local: { email: 'othercompany@alenvi.io', password: '123456!eR' },
  refreshToken: uuidv4(),
  role: { client: rolesList.find(role => role.name === 'coach')._id },
  inactivityDate: '2018-11-01T12:52:27.461Z',
  isConfirmed: false,
  company: otherCompany._id,
};

const activationCode = {
  _id: new ObjectID(),
  firstSMS: Date.now(),
  code: '1234',
  user: activationCodeUser._id,
  company: authCompany._id,
};

const activationCodeFromOtherCompany = {
  _id: new ObjectID(),
  firstSMS: Date.now(),
  code: '4321',
  user: activationCodeUser._id,
  company: otherCompany._id,
};

const populateDB = async () => {
  await ActivationCode.deleteMany({});
  await User.deleteMany({});
  await populateDBForAuthentication();
  await User.create(activationCodeUser);
  await User.create(userFromOtherCompany);
  await ActivationCode.create(activationCode);
  await ActivationCode.create(activationCodeFromOtherCompany);
};

module.exports = {
  activationCode,
  populateDB,
  activationCodeUser,
  userFromOtherCompany,
  activationCodeFromOtherCompany,
};
