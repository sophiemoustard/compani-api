const { ObjectID } = require('mongodb');
const ActivityHistory = require('../../../src/models/ActivityHistory');
const { populateDBForAuthentication } = require('./authenticationSeed');

const activityHistoriesList = [
  {
    _id: new ObjectID(),
    user: new ObjectID(),
    activity: new ObjectID(),
    date: new Date(),
  },
];

const populateDB = async () => {
  await ActivityHistory.deleteMany({});

  await populateDBForAuthentication();

  await ActivityHistory.insertMany(activityHistoriesList);
};

module.exports = {
  populateDB,
  activityHistoriesList,
};
