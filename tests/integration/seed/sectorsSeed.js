const { ObjectID } = require('mongodb');
const Sector = require('../../../src/models/Sector');
const SectorHistory = require('../../../src/models/SectorHistory');
const { populateDBForAuthentication, authCompany, otherCompany } = require('./authenticationSeed');

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

const populateDB = async () => {
  await Sector.deleteMany({});
  await SectorHistory.deleteMany({});

  await populateDBForAuthentication();
  await Sector.insertMany(sectorsList);
  await SectorHistory.insertMany(historyList);
};

module.exports = { sectorsList, populateDB };
