const { ObjectID } = require('mongodb');
const uuidv4 = require('uuid/v4');
const ActivationCode = require('../../../src/models/ActivationCode');
const User = require('../../../src/models/User');
const { rolesList } = require('./authenticationSeed');
const { populateDBForAuthentication } = require('./authenticationSeed');

const activationCodeUser = {
  _id: new ObjectID(),
  identity: { firstname: 'Test5', lastname: 'Test5' },
  local: { email: 'test5@alenvi.io', password: '123456' },
  refreshToken: uuidv4(),
  role: rolesList.find(role => role.name === 'coach')._id,
  inactivityDate: '2018-11-01T12:52:27.461Z',
  isConfirmed: false,
};

const activationCode = {
  _id: new ObjectID(),
  firstSMS: Date.now(),
  code: '1234',
  user: activationCodeUser._id,
};

const populateDB = async () => {
  await ActivationCode.deleteMany({});
  await User.deleteMany({});
  await populateDBForAuthentication();
  await new User(activationCodeUser).save();
  const code = new ActivationCode(activationCode);
  await code.save();
};

module.exports = {
  activationCode,
  populateDB,
  activationCodeUser,
};
