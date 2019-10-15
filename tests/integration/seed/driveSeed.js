const { ObjectID } = require('mongodb');
const uuidv4 = require('uuid/v4');
const User = require('../../../src/models/User');
const { rolesList, populateDBForAuthentification } = require('./authentificationSeed');

const auxiliary = {
  _id: new ObjectID(),
  identity: { firstname: 'Harry', lastname: 'Potter' },
  local: { email: 'h@p.com', password: 'baguette' },
  administrative: { driveFolder: { driveId: '1234567890' } },
  refreshToken: uuidv4(),
  role: rolesList[1]._id,
};

const populateDB = async () => {
  await User.deleteMany({});

  await populateDBForAuthentification();
  await (new User(auxiliary)).save();
};

module.exports = { populateDB, auxiliary };
