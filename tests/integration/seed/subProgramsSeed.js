const { ObjectID } = require('mongodb');
const Program = require('../../../src/models/Program');
const SubProgram = require('../../../src/models/SubProgram');
const Step = require('../../../src/models/Step');
const Activity = require('../../../src/models/Activity');
const Course = require('../../../src/models/Course');
const Card = require('../../../src/models/Card');
const { populateDBForAuthentication } = require('./authenticationSeed');

const cardsList = [
  { _id: new ObjectID(), template: 'transition', title: 'ceci est un titre' },
  { _id: new ObjectID(), template: 'transition', title: 'ceci est un titre' },
  { _id: new ObjectID(), template: 'transition', title: 'ceci est un titre' },
];

const activitiesList = [
  {
    _id: new ObjectID(),
    type: 'sharing_experience',
    name: 'activite',
    cards: [cardsList[0]._id, cardsList[1]._id, cardsList[2]._id],
  },
  {
    _id: new ObjectID(),
    type: 'sharing_experience',
    name: 'activite',
    cards: [],
  },
];

const stepsList = [
  { _id: new ObjectID(), name: 'step 1', type: 'on_site' },
  { _id: new ObjectID(), name: 'step 2', type: 'e_learning', activities: [activitiesList[0]._id] },
  { _id: new ObjectID(), name: 'step 3', type: 'e_learning', activities: [activitiesList[0]._id] },
  { _id: new ObjectID(), name: 'step 3', type: 'e_learning' },
  { _id: new ObjectID(), name: 'step 3', type: 'e_learning', activities: [activitiesList[1]._id] },
];

const subProgramsList = [
  { _id: new ObjectID(), name: 'subProgram 1', steps: [stepsList[0]._id, stepsList[1]._id] },
  { _id: new ObjectID(), name: 'subProgram 2', steps: [stepsList[1]._id] },
  { _id: new ObjectID(), name: 'subProgram 3', status: 'published', steps: [stepsList[0]._id] },
  { _id: new ObjectID(), name: 'subProgram 4', status: 'draft', steps: [stepsList[2]._id] },
  { _id: new ObjectID(), name: 'subProgram 5', status: 'published', steps: [stepsList[2]._id] },
  { _id: new ObjectID(), name: 'subProgram 6', status: 'draft', steps: [stepsList[3]._id] },
  { _id: new ObjectID(), name: 'subProgram 7', status: 'draft', steps: [stepsList[4]._id] },
];

const programsList = [
  { _id: new ObjectID(), name: 'program 1', subPrograms: [subProgramsList[0]._id, subProgramsList[1]._id] },
  {
    _id: new ObjectID(),
    name: 'program 2',
    subPrograms: [subProgramsList[3]._id, subProgramsList[4]._id],
    image: 'link',
  },
];

const coursesList = [{
  _id: new ObjectID(),
  format: 'strictly_e_learning',
  subProgram: subProgramsList[4]._id,
  type: 'intra',
  company: new ObjectID(),
}];

const populateDB = async () => {
  await Program.deleteMany({});
  await SubProgram.deleteMany({});
  await Step.deleteMany({});
  await Activity.deleteMany({});
  await Course.deleteMany({});
  await Card.deleteMany({});

  await populateDBForAuthentication();

  await Program.insertMany(programsList);
  await SubProgram.insertMany(subProgramsList);
  await Step.insertMany(stepsList);
  await Activity.insertMany(activitiesList);
  await Course.insertMany(coursesList);
  await Card.insertMany(cardsList);
};

module.exports = {
  populateDB,
  subProgramsList,
  stepsList,
  activitiesList,
  cardsList,
};
