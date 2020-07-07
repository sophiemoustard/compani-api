const { ObjectID } = require('mongodb');
const Program = require('../../../src/models/Program');
const Module = require('../../../src/models/Module');
const { populateDBForAuthentication } = require('./authenticationSeed');

const modulesList = [
  { _id: new ObjectID(), title: 'c\'est un module' },
  { _id: new ObjectID(), title: 'toujours un module' },
  { _id: new ObjectID(), title: 'encore un module' },
];

const programsList = [
  { _id: new ObjectID(), name: 'program', modules: [modulesList[0]._id, modulesList[1]._id] },
  { _id: new ObjectID(), name: 'training program', modules: [modulesList[2]._id] },
];

const populateDB = async () => {
  await Program.deleteMany({});
  await Module.deleteMany({});

  await populateDBForAuthentication();

  await Program.insertMany(programsList);
  await Module.insertMany(modulesList);
};

module.exports = {
  populateDB,
  modulesList,
};
