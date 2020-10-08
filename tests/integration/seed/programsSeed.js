const { ObjectID } = require('mongodb');
const Program = require('../../../src/models/Program');
const SubProgram = require('../../../src/models/SubProgram');
const Step = require('../../../src/models/Step');
const Activity = require('../../../src/models/Activity');
const Card = require('../../../src/models/Card');
const Course = require('../../../src/models/Course');
const { populateDBForAuthentication } = require('./authenticationSeed');

const cards = [
  { _id: new ObjectID(), template: 'transition', title: 'skusku' },
  { _id: new ObjectID(), template: 'transition' },
];

const activitiesList = [
  { _id: new ObjectID(), name: 'c\'est une activité', type: 'sharing_experience', cards: [cards[0]._id] },
  { _id: new ObjectID(), name: 'toujours une activité', type: 'quiz', cards: [cards[1]._id] },
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
  { _id: new ObjectID(), type: 'on_site', name: 'encore une étape', activities: [activitiesList[1]._id] },
];

const subProgramsList = [
  { _id: new ObjectID(), name: 'c\'est un sous-programme', steps: [stepsList[2]._id] },
  { _id: new ObjectID(), name: 'c\'est un sous-programme', steps: [stepsList[3]._id] },
  { _id: new ObjectID(), name: 'c\'est un sous-programme elearning', steps: [stepsList[1]._id] },
];

const programsList = [
  { _id: new ObjectID(), name: 'program', subPrograms: [subProgramsList[0]._id] },
  { _id: new ObjectID(), name: 'training program', subPrograms: [subProgramsList[2]._id] },
  { _id: new ObjectID(), name: 'non valid program', subPrograms: [subProgramsList[1]._id] },
];

const course = {
  _id: new ObjectID(),
  subProgram: subProgramsList[1]._id,
  misc: 'first session',
  type: 'inter_b2c',
  trainer: new ObjectID(),
  format: 'strictly_e_learning',
};

const populateDB = async () => {
  await Program.deleteMany({});
  await SubProgram.deleteMany({});
  await Step.deleteMany({});
  await Activity.deleteMany({});
  await Card.deleteMany({});
  await Course.deleteMany({});

  await populateDBForAuthentication();

  await SubProgram.insertMany(subProgramsList);
  await Program.insertMany(programsList);
  await Step.insertMany(stepsList);
  await Activity.insertMany(activitiesList);
  await Card.insertMany(cards);
  await new Course(course).save();
};

module.exports = {
  populateDB,
  programsList,
};
