const { ObjectID } = require('mongodb');
const Questionnaire = require('../../../src/models/Questionnaire');
const Course = require('../../../src/models/Course');
const Card = require('../../../src/models/Card');
const { userList } = require('../../seed/authUsersSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');

const questionnaireHistoriesUsersList = [userList[6]._id, userList[5]._id];

const cardsList = [
  { _id: new ObjectID(), template: 'survey', question: 'test?' },
  { _id: new ObjectID(), template: 'survey', question: 'test2?' },
  { _id: new ObjectID(), template: 'single_choice_question', question: 'test3?' },
  { _id: new ObjectID(), template: 'open_question', question: 'test4?' },
  { _id: new ObjectID(), template: 'question_answer', question: 'test5?', isQuestionAnswerMultipleChoiced: true },
  { _id: new ObjectID(), template: 'question_answer', question: 'test6?', isQuestionAnswerMultipleChoiced: false },
];

const questionnairesList = [
  {
    _id: new ObjectID(),
    name: 'test',
    status: 'draft',
    type: 'expectations',
    cards: [cardsList[0]._id, cardsList[2]._id, cardsList[3]._id, cardsList[4]._id, cardsList[5]._id],
  },
];

const coursesList = [
  {
    _id: new ObjectID(),
    format: 'blended',
    subProgram: new ObjectID(),
    type: 'inter_b2b',
    salesRepresentative: new ObjectID(),
    trainees: [questionnaireHistoriesUsersList[0]],
  },
  {
    _id: new ObjectID(),
    format: 'blended',
    subProgram: new ObjectID(),
    type: 'inter_b2b',
    salesRepresentative: new ObjectID(),
    trainees: [questionnaireHistoriesUsersList[1]],
  },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Questionnaire.insertMany(questionnairesList);
  await Course.insertMany(coursesList);
  await Card.insertMany(cardsList);
};

module.exports = {
  populateDB,
  questionnairesList,
  coursesList,
  questionnaireHistoriesUsersList,
  cardsList,
};
