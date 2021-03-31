const { ObjectID } = require('mongodb');
const Questionnaire = require('../../../src/models/Questionnaire');
const Card = require('../../../src/models/Card');
const { populateDBForAuthentication } = require('./authenticationSeed');
const { OPEN_QUESTION, SURVEY } = require('../../../src/helpers/constants');

const cardsList = [
  { _id: new ObjectID(), template: OPEN_QUESTION },
  { _id: new ObjectID(), template: SURVEY },
];

const questionnairesList = [
  {
    _id: new ObjectID(),
    title: 'test',
    status: 'draft',
    type: 'expectations',
    cards: [cardsList[0]._id],
  },
  {
    _id: new ObjectID(),
    title: 'test2',
    status: 'published',
    type: 'expectations',
    cards: [cardsList[1]._id],
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
