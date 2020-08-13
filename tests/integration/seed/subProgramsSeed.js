const { ObjectID } = require('mongodb');
const Program = require('../../../src/models/Program');
const SubProgram = require('../../../src/models/SubProgram');
const { populateDBForAuthentication } = require('./authenticationSeed');

const subProgramsList = [
  { _id: new ObjectID(), name: 'sp1' },
];

const programsList = [
  { _id: new ObjectID(), name: 'p1', subPrograms: [subProgramsList[0]._id] },
];

const populateDB = async () => {
  await Program.deleteMany({});
  await SubProgram.deleteMany({});

  await populateDBForAuthentication();

  await Program.insertMany(programsList);
  await SubProgram.insertMany(subProgramsList);
};

module.exports = {
  populateDB,
  subProgramsList,
};
