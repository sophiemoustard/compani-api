const { ObjectID } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const Sector = require('../../../src/models/Sector');
const SectorHistory = require('../../../src/models/SectorHistory');
const User = require('../../../src/models/User');
const { populateDBForAuthentication, authCompany, otherCompany } = require('./authenticationSeed');
const { WEBAPP } = require('../../../src/helpers/constants');
const { rolesList } = require('./authenticationSeed');

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
  inactivityDate: null,
  employee_id: 123456789,
  refreshToken: uuidv4(),
  role: { client: rolesList[1]._id },
  contracts: [new ObjectID()],
  company: otherCompany._id,
  origin: WEBAPP,
};

const populateDB = async () => {
  await Sector.deleteMany({});
  await SectorHistory.deleteMany({});
  await User.deleteMany({});

  await populateDBForAuthentication();
  await Sector.insertMany(sectorsList);
  await SectorHistory.insertMany(historyList);
  await User.create(userFromOtherCompany);
};

module.exports = { sectorsList, populateDB, userFromOtherCompany };
