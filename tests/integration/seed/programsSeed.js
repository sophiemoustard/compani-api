const { ObjectID } = require('mongodb');
const Program = require('../../../src/models/Program');
const { populateDBForAuthentication } = require('./authenticationSeed');

const programsList = [
  { _id: new ObjectID(), name: 'program' },
  { _id: new ObjectID(), name: 'training program' },
];

const populateDB = async () => {
  await Program.deleteMany({});

  await populateDBForAuthentication();

  await Program.insertMany(programsList);
};

module.exports = {
  populateDB,
  programsList,
};
