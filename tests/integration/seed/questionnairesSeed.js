const { ObjectID } = require('mongodb');
const Questionnaire = require('../../../src/models/Questionnaire');
const { populateDBForAuthentication } = require('./authenticationSeed');
const { TRANSITION, SURVEY } = require('../../../src/helpers/constants');

const cardsList = [{ _id: new ObjectID(), template: TRANSITION }, { _id: new ObjectID(), template: SURVEY }];

const questionnairesList = [
  {
    _id: new ObjectID(),
    title: 'test',
    status: 'draft',
    type: 'expectations',
    cards: [cardsList[0]._id, cardsList[1]._id],
  },
  { _id: new ObjectID(), title: 'test', status: 'published', type: 'expectations' },
];

const populateDB = async () => {
  await Questionnaire.deleteMany({});

  await populateDBForAuthentication();

  await Questionnaire.insertMany(questionnairesList);
};

module.exports = {
  populateDB,
  questionnairesList,
};
