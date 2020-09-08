const { ObjectID } = require('mongodb');
const Program = require('../../../src/models/Program');
const SubProgram = require('../../../src/models/SubProgram');
const Step = require('../../../src/models/Step');
const Activity = require('../../../src/models/Activity');
const { populateDBForAuthentication } = require('./authenticationSeed');

const activitiesList = [
  { _id: new ObjectID(), name: 'c\'est une activité', type: 'sharing_experience' },
  { _id: new ObjectID(), name: 'toujours une activité', type: 'quiz' },
];

const stepsList = [
  {
    _id: new ObjectID(),
    type: 'e_learning',
    name: 'c\'est une étape',
    activities: [activitiesList[0]._id, activitiesList[1]._id],
  },
  { _id: new ObjectID(), type: 'e_learning', name: 'toujours une étape' },
  { _id: new ObjectID(), type: 'on_site', name: 'encore une étape', activities: [activitiesList[0]._id] },
];

const subProgramsList = [
  {
    _id: new ObjectID(),
    name: 'c\'est un sous-programme',
    steps: [stepsList[2]._id],
  },
];

const programsList = [
  {
    _id: new ObjectID(),
    name: 'program',
    subPrograms: [subProgramsList[0]._id],
  },
  { _id: new ObjectID(), name: 'training program' },
];

const populateDB = async () => {
  await Program.deleteMany({});
  await SubProgram.deleteMany({});
  await Step.deleteMany({});
  await Activity.deleteMany({});

  await populateDBForAuthentication();

  await SubProgram.insertMany(subProgramsList);
  await Program.insertMany(programsList);
  await Step.insertMany(stepsList);
  await Activity.insertMany(activitiesList);
};

module.exports = {
  populateDB,
  programsList,
};
