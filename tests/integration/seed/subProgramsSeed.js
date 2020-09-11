const { ObjectID } = require('mongodb');
const Program = require('../../../src/models/Program');
const SubProgram = require('../../../src/models/SubProgram');
const Step = require('../../../src/models/Step');
const { populateDBForAuthentication } = require('./authenticationSeed');

const stepsList = [
  { _id: new ObjectID(), name: 'step 1', type: 'on_site' },
  { _id: new ObjectID(), name: 'step 2', type: 'e_learning' },
];

const subProgramsList = [
  { _id: new ObjectID(), name: 'subProgram 1', steps: [stepsList[0]._id, stepsList[1]._id] },
  { _id: new ObjectID(), name: 'subProgram 2', steps: [] },
  { _id: new ObjectID(), name: 'subProgram 3', status: 'published', steps: [stepsList[0]._id] },
];

const programsList = [
  { _id: new ObjectID(), name: 'program 1', subPrograms: [subProgramsList[0]._id, subProgramsList[1]._id] },
];

const populateDB = async () => {
  await Program.deleteMany({});
  await SubProgram.deleteMany({});
  await Step.deleteMany({});

  await populateDBForAuthentication();

  await Program.insertMany(programsList);
  await SubProgram.insertMany(subProgramsList);
  await Step.insertMany(stepsList);
};

module.exports = {
  populateDB,
  subProgramsList,
};
