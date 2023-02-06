const { ObjectId } = require('mongodb');
const { authCompany } = require('./authCompaniesSeed');
const { userList } = require('./authUsersSeed');

const sector = { _id: new ObjectId(), name: 'Test', company: authCompany._id };

const sectorHistories = [
  {
    _id: new ObjectId(),
    auxiliary: userList[2]._id,
    sector: sector._id,
    company: authCompany._id,
    startDate: '2022-12-10T00:00:00.000Z',
  },
  {
    _id: new ObjectId(),
    auxiliary: userList[4]._id,
    sector: sector._id,
    company: authCompany._id,
    startDate: '2022-12-10T00:00:00.000Z',
  },
];

module.exports = { sectorHistories, sector };
