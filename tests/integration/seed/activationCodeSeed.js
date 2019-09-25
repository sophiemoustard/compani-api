const { ObjectID } = require('mongodb');
const uuidv4 = require('uuid/v4');
const ActivationCode = require('../../../src/models/ActivationCode');
const User = require('../../../src/models/User');
const { rolesList } = require('./authentificationSeed');
const { populateDBForAuthentification } = require('./authentificationSeed');

const activationCode = {
  _id: new ObjectID(),
  firstSMS: Date.now(),
  code: '1234',
  userEmail: 'toto@tt.com',
  newUserId: new ObjectID(),
};

const activationCodeUser = {
  _id: new ObjectID(),
  identity: { firstname: 'Test5', lastname: 'Test5' },
  local: { email: 'test5@alenvi.io', password: '123456' },
  refreshToken: uuidv4(),
  role: rolesList.find(role => role.name === 'coach')._id,
  inactivityDate: '2018-11-01T12:52:27.461Z',
};

const populateDB = async () => {
  await ActivationCode.deleteMany({});
  await populateDBForAuthentification();
  await new User(activationCodeUser).save();
  const code = new ActivationCode(activationCode);
  await code.save();
};

module.exports = {
  activationCode,
  populateDB,
  activationCodeUser,
};
