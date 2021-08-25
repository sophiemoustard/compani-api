const { ObjectID } = require('mongodb');
const Activity = require('../../../src/models/Activity');
const Step = require('../../../src/models/Step');
const SubProgram = require('../../../src/models/SubProgram');
const Course = require('../../../src/models/Course');
const Card = require('../../../src/models/Card');
const ActivityHistory = require('../../../src/models/ActivityHistory');
const { userList, vendorAdmin } = require('../../seed/authUsersSeed');
const { STRICTLY_E_LEARNING } = require('../../../src/helpers/constants');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');

const activityHistoriesUsersList = [userList[6]._id, userList[5]._id];

const cardsList = [
  { _id: new ObjectID(), template: 'survey', question: 'test?' },
  { _id: new ObjectID(), template: 'survey', question: 'test2?' },
  { _id: new ObjectID(), template: 'single_choice_question', question: 'test3?' },
  { _id: new ObjectID(), template: 'open_question', question: 'test4?' },
  { _id: new ObjectID(), template: 'question_answer', question: 'test5?', isQuestionAnswerMultipleChoiced: true },
  { _id: new ObjectID(), template: 'question_answer', question: 'test6?', isQuestionAnswerMultipleChoiced: false },
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
    salesRepresentative: vendorAdmin._id,
    format: STRICTLY_E_LEARNING,
  }];

const activityHistories = [
  {
    _id: new ObjectID(),
    user: userList[6]._id,
    activity: activitiesList[0]._id,
    date: new Date('2020-12-15T23:00:00'),
  },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Activity.insertMany(activitiesList);
  await Step.insertMany(stepsList);
  await SubProgram.insertMany(subProgramsList);
  await Course.insertMany(coursesList);
  await Card.insertMany(cardsList);
  await ActivityHistory.insertMany(activityHistories);
};

module.exports = {
  populateDB,
  activitiesList,
  stepsList,
  subProgramsList,
  coursesList,
  activityHistoriesUsersList,
  cardsList,
  activityHistories,
};
