const { ObjectID } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const { WEBAPP } = require('../../../src/helpers/constants');
const User = require('../../../src/models/User');
const UserCompany = require('../../../src/models/UserCompany');
const { rolesList, authCompany } = require('./authenticationSeed');
const { deleteNonAuthenticationSeeds } = require('./initializeDB');

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
  origin: WEBAPP,
};

const userCompany = { _id: new ObjectID(), user: auxiliary._id, company: authCompany._id };

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await (new User(auxiliary)).save();
  await UserCompany.create(userCompany);
};

module.exports = { populateDB, auxiliary };
