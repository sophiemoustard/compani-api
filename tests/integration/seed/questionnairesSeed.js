const { ObjectID } = require('mongodb');
const Questionnaire = require('../../../src/models/Questionnaire');
const Card = require('../../../src/models/Card');
const Course = require('../../../src/models/Course');
const CourseSlot = require('../../../src/models/CourseSlot');
const { populateDBForAuthentication } = require('./authenticationSeed');
const { TRANSITION, OPEN_QUESTION } = require('../../../src/helpers/constants');

const cardsList = [
  { _id: new ObjectID(), template: TRANSITION, title: 'test1' },
  { _id: new ObjectID(), template: OPEN_QUESTION, question: 'question?' },
  { _id: new ObjectID(), template: TRANSITION, title: 'test2' },
  { _id: new ObjectID(), template: OPEN_QUESTION, question: 'question?' },
];

const questionnairesList = [
  {
    _id: new ObjectID(),
    title: 'test',
    status: 'draft',
    type: 'expectations',
    cards: [cardsList[0]._id, cardsList[1]._id],
  },
  {
    _id: new ObjectID(),
    title: 'test',
    status: 'published',
    type: 'expectations',
    cards: [cardsList[2]._id, cardsList[3]._id],
  },
];

const coursesList = [{
  _id: new ObjectID(),
  format: 'blended',
  subProgram: new ObjectID(),
  type: 'inter_b2b',
  salesRepresentative: new ObjectID(),
}];

const slots = [{
  startDate: new Date('2021-04-20T09:00:00'),
  endDate: new Date('2021-04-20T11:00:00'),
  course: coursesList[0],
  step: new ObjectID(),
}];

const populateDB = async () => {
  await Questionnaire.deleteMany({});
  await Card.deleteMany({});
  await Course.deleteMany({});
  await CourseSlot.deleteMany({});

  await populateDBForAuthentication();

  await Questionnaire.insertMany(questionnairesList);
  await Card.insertMany(cardsList);
  await Course.insertMany(coursesList);
  await CourseSlot.insertMany(slots);
};

module.exports = {
  populateDB,
  questionnairesList,
  cardsList,
  coursesList,
};
