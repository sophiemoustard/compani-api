const { ObjectID } = require('mongodb');
const Step = require('../../../src/models/Step');
const Activity = require('../../../src/models/Activity');
const { populateDBForAuthentication } = require('./authenticationSeed');

const activitiesList = [
  { _id: new ObjectID(), title: 'manger' },
  { _id: new ObjectID(), title: 'bouger' },
  { _id: new ObjectID(), title: 'fumer' },
];

const stepsList = [
  { _id: new ObjectID(), title: 'rouge', activities: [activitiesList[0]._id, activitiesList[1]._id] },
  { _id: new ObjectID(), title: 'bleu', activities: [activitiesList[2]._id] },
];

const populateDB = async () => {
  await Step.deleteMany({});
  await Activity.deleteMany({});

  await populateDBForAuthentication();

  await Step.insertMany(stepsList);
  await Activity.insertMany(activitiesList);
};

module.exports = {
  populateDB,
  activitiesList,
  stepsList,
};
