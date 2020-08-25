const { ObjectID } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const User = require('../../../src/models/User');
const { rolesList, populateDBForAuthentication, authCompany } = require('./authenticationSeed');

const auxiliary = {
  _id: new ObjectID(),
  identity: { firstname: 'Harry', lastname: 'Potter' },
  local: { email: 'h@p.com', password: '123456!eR' },
  administrative: {
    driveFolder: { driveId: '1234567890' },
    passport: { driveId: '1234567890', link: 'https://test.com/1234567890' },
  },
  refreshToken: uuidv4(),
  role: { client: rolesList[1]._id },
  company: authCompany._id,
};

const populateDB = async () => {
  await User.deleteMany({});

  await populateDBForAuthentication();
  await (new User(auxiliary)).save();
};

module.exports = { populateDB, auxiliary };
