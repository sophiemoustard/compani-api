const { ObjectID } = require('mongodb');
const Module = require('../../../src/models/Module');
const Activity = require('../../../src/models/Activity');
const { populateDBForAuthentication } = require('./authenticationSeed');

const activitiesList = [
  { _id: new ObjectID(), title: 'manger' },
  { _id: new ObjectID(), title: 'bouger' },
  { _id: new ObjectID(), title: 'fumer' },
];

const modulesList = [
  { _id: new ObjectID(), title: 'rouge', activities: [activitiesList[0]._id, activitiesList[1]._id] },
  { _id: new ObjectID(), title: 'bleu', activities: [activitiesList[2]._id] },
];

const populateDB = async () => {
  await Module.deleteMany({});
  await Activity.deleteMany({});

  await populateDBForAuthentication();

  await Module.insertMany(modulesList);
  await Activity.insertMany(activitiesList);
};

module.exports = {
  populateDB,
  activitiesList,
  modulesList,
};
