const { ObjectId } = require('mongodb');
const Questionnaire = require('../../../src/models/Questionnaire');
const Course = require('../../../src/models/Course');
const Card = require('../../../src/models/Card');
const { userList } = require('../../seed/authUsersSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');
const { INTER_B2B } = require('../../../src/helpers/constants');

const questionnaireHistoriesUsersList = [userList[6]._id, userList[5]._id];

const cardsList = [
  { _id: new ObjectId(), template: 'survey', question: 'test?' },
  { _id: new ObjectId(), template: 'survey', question: 'test2?' },
  { _id: new ObjectId(), template: 'single_choice_question', question: 'test3?' },
  { _id: new ObjectId(), template: 'open_question', question: 'test4?' },
  { _id: new ObjectId(), template: 'question_answer', question: 'test5?', isQuestionAnswerMultipleChoiced: true },
  { _id: new ObjectId(), template: 'question_answer', question: 'test6?', isQuestionAnswerMultipleChoiced: false },
];

const questionnairesList = [
  {
    _id: new ObjectId(),
    name: 'test',
    status: 'draft',
    type: 'expectations',
    cards: [cardsList[0]._id, cardsList[2]._id, cardsList[3]._id, cardsList[4]._id, cardsList[5]._id],
  },
];

const coursesList = [
  {
    _id: new ObjectId(),
    format: 'blended',
    subProgram: new ObjectId(),
    type: INTER_B2B,
    salesRepresentative: new ObjectId(),
    trainees: [questionnaireHistoriesUsersList[0]],
  },
  {
    _id: new ObjectId(),
    format: 'blended',
    subProgram: new ObjectId(),
    type: INTER_B2B,
    salesRepresentative: new ObjectId(),
    trainees: [questionnaireHistoriesUsersList[1]],
  },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    Questionnaire.create(questionnairesList),
    Course.create(coursesList),
    Card.create(cardsList),
  ]);
};

module.exports = {
  populateDB,
  questionnairesList,
  coursesList,
  questionnaireHistoriesUsersList,
  cardsList,
};
