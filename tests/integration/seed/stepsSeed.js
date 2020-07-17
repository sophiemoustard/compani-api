const { ObjectID } = require('mongodb');
const Program = require('../../../src/models/Program');
const Step = require('../../../src/models/Step');
const { populateDBForAuthentication } = require('./authenticationSeed');

const stepsList = [
  { _id: new ObjectID(), type: 'on_site', title: 'c\'est une étape' },
  { _id: new ObjectID(), type: 'e_learning', title: 'toujours une étape' },
  { _id: new ObjectID(), type: 'e_learning', title: 'encore une étape' },
];

const programsList = [
  { _id: new ObjectID(), name: 'program', steps: [stepsList[0]._id, stepsList[1]._id] },
  { _id: new ObjectID(), name: 'training program', steps: [stepsList[2]._id] },
];

const populateDB = async () => {
  await Program.deleteMany({});
  await Step.deleteMany({});

  await populateDBForAuthentication();

  await Program.insertMany(programsList);
  await Step.insertMany(stepsList);
};

module.exports = {
  populateDB,
  stepsList,
};
