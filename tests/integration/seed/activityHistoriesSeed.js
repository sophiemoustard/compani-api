const { ObjectID } = require('mongodb');
const Activity = require('../../../src/models/Activity');
const Step = require('../../../src/models/Step');
const SubProgram = require('../../../src/models/SubProgram');
const Course = require('../../../src/models/Course');
const Card = require('../../../src/models/Card');
const { populateDBForAuthentication } = require('./authenticationSeed');
const { userList } = require('../../seed/userSeed');

const activityHistoriesUsersList = [userList[6]._id, userList[5]._id];

const cardsList = [
  { _id: new ObjectID(), template: 'survey', question: 'test?' },
  { _id: new ObjectID(), template: 'survey', question: 'test2?' },
  { _id: new ObjectID(), template: 'single_choice_question', question: 'test3?' },
  { _id: new ObjectID(), template: 'open_question', question: 'test4?' },
  { _id: new ObjectID(), template: 'question_answer', question: 'test5?', isQuestionAnswerMultipleChoiced: true },
  { _id: new ObjectID(), template: 'question_answer', question: 'test6?', isQuestionAnswerMultipleChoiced: false },
  { _id: new ObjectID(), template: 'open_question', question: 'test7?', isMandatory: true },
];

const activitiesList = [
  { _id: new ObjectID(),
    name: 'bouger',
    type: 'lesson',
    cards: [cardsList[0]._id, cardsList[2]._id, cardsList[3]._id, cardsList[4]._id, cardsList[5]._id] },
];

const stepsList = [{
  _id: new ObjectID(),
  type: 'on_site',
  name: 'c\'est une étape',
  activities: [activitiesList[0]._id],
}];

const subProgramsList = [
  { _id: new ObjectID(), name: 'sous-programme A', steps: [stepsList[0]._id] },
];

const coursesList = [
  {
    _id: new ObjectID(),
    subProgram: subProgramsList[0]._id,
    company: new ObjectID(),
    misc: 'first session',
    type: 'intra',
    trainer: new ObjectID(),
    trainees: [userList[6]._id],
  }];

const populateDB = async () => {
  await Activity.deleteMany({});
  await Step.deleteMany({});
  await SubProgram.deleteMany({});
  await Course.deleteMany({});
  await Card.deleteMany({});

  await populateDBForAuthentication();

  await Activity.insertMany(activitiesList);
  await Step.insertMany(stepsList);
  await SubProgram.insertMany(subProgramsList);
  await Course.insertMany(coursesList);
  await Card.insertMany(cardsList);
};

module.exports = {
  populateDB,
  activitiesList,
  stepsList,
  subProgramsList,
  coursesList,
  activityHistoriesUsersList,
  cardsList,
};
