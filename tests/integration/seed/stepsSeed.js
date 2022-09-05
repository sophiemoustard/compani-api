const { ObjectId } = require('mongodb');
const Program = require('../../../src/models/Program');
const SubProgram = require('../../../src/models/SubProgram');
const Step = require('../../../src/models/Step');
const Activity = require('../../../src/models/Activity');
const Card = require('../../../src/models/Card');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');

const cardsList = [
  { _id: new ObjectId(), template: 'transition', title: 'do mi sol do' },
  { _id: new ObjectId(), template: 'fill_the_gaps' },
];

const activitiesList = [
  { _id: new ObjectId(), type: 'lesson', name: 'chanter', cards: [cardsList[0]] },
  { _id: new ObjectId(), type: 'video', name: 'gater le coin', cards: [cardsList[0]] },
  { _id: new ObjectId(), type: 'lesson', name: 'douche', cards: [cardsList[1]] },
  { _id: new ObjectId(), type: 'lesson', name: 'published activity', status: 'published', cards: [cardsList[0]] },
];

const stepsList = [
  { _id: new ObjectId(), type: 'on_site', name: 'etape 1', activities: [activitiesList[1]._id, activitiesList[2]._id] },
  { _id: new ObjectId(), type: 'e_learning', name: 'etape 2', activities: [activitiesList[0]._id] },
  { _id: new ObjectId(), type: 'e_learning', name: 'etape 3' },
  { _id: new ObjectId(), type: 'on_site', name: 'etape 4', status: 'published', activities: [activitiesList[3]._id] },
  { _id: new ObjectId(), type: 'on_site', name: 'etape 5 - sans sous-prog', activities: [activitiesList[2]._id] },
];

const subProgramList = [
  { _id: new ObjectId(), name: 'subProgram 1', steps: [stepsList[0]._id, stepsList[1]._id] },
  { _id: new ObjectId(), name: 'subProgram 2', steps: [stepsList[0]._id, stepsList[2]._id] },
  { _id: new ObjectId(), name: 'subProgram 3', steps: [stepsList[2]._id, stepsList[3]._id] },
];

const programsList = [
  { _id: new ObjectId(), name: 'program 1', subPrograms: [subProgramList[0]._id, subProgramList[1]._id] },
  { _id: new ObjectId(), name: 'program 2', subProgram: [subProgramList[2]._id] },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    Program.create(programsList),
    SubProgram.create(subProgramList),
    Step.create(stepsList),
    Activity.create(activitiesList),
    Card.create(cardsList),
  ]);
};

module.exports = {
  populateDB,
  programsList,
  stepsList,
  activitiesList,
  cardsList,
};
