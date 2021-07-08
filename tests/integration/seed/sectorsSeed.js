const { ObjectID } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const Sector = require('../../../src/models/Sector');
const SectorHistory = require('../../../src/models/SectorHistory');
const User = require('../../../src/models/User');
const { populateDBForAuthentication, authCompany, otherCompany } = require('./authenticationSeed');
const { WEBAPP } = require('../../../src/helpers/constants');
const { rolesList } = require('./authenticationSeed');
const UserCompany = require('../../../src/models/UserCompany');

const sectorsList = [
  { _id: new ObjectID(), name: 'Test', company: authCompany._id },
  { _id: new ObjectID(), name: 'Test', company: otherCompany._id },
  { _id: new ObjectID(), name: 'Test2', company: authCompany._id },
];

const historyList = [
  {
    _id: new ObjectID(),
    auxiliary: new ObjectID(),
    sector: sectorsList[0]._id,
    startDate: '2020-03-20T00:00:00',
    company: otherCompany._id,
  },
  {
    _id: new ObjectID(),
    auxiliary: new ObjectID(),
    sector: sectorsList[0]._id,
    startDate: '2020-03-20T00:00:00',
    company: otherCompany._id,
  },
  {
    _id: new ObjectID(),
    auxiliary: new ObjectID(),
    sector: sectorsList[1]._id,
    startDate: '2020-03-20T00:00:00',
    company: otherCompany._id,
  },
];

const userFromOtherCompany = {
  _id: new ObjectID(),
  identity: { firstname: 'Test7', lastname: 'Test7' },
  local: { email: 'test@othercompany.io', password: '123456!eR' },
  refreshToken: uuidv4(),
  role: { client: rolesList[1]._id },
  contracts: [new ObjectID()],
  origin: WEBAPP,
};

const userCompany = { _id: new ObjectID(), user: userFromOtherCompany._id, company: otherCompany._id };

const populateDB = async () => {
  await Sector.deleteMany();
  await SectorHistory.deleteMany();
  await User.deleteMany();
  await UserCompany.deleteMany();

  await populateDBForAuthentication();
  await Sector.insertMany(sectorsList);
  await SectorHistory.insertMany(historyList);
  await User.create(userFromOtherCompany);
  await UserCompany.create(userCompany);
};

module.exports = { sectorsList, populateDB, userFromOtherCompany };
