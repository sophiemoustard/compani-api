const { ObjectID } = require('mongodb');
const Questionnaire = require('../../../src/models/Questionnaire');
const Card = require('../../../src/models/Card');
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
  {
    _id: new ObjectID(),
    title: 'test',
    status: 'draft',
    type: 'end_of_course',
    cards: [cardsList[2]._id, cardsList[3]._id],
  },
];

const populateDB = async () => {
  await Questionnaire.deleteMany({});
  await Card.deleteMany({});

  await populateDBForAuthentication();

  await Questionnaire.insertMany(questionnairesList);
  await Card.insertMany(cardsList);
};

module.exports = {
  populateDB,
  questionnairesList,
  cardsList,
};
