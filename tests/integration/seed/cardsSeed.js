const { ObjectID } = require('mongodb');
const Card = require('../../../src/models/Card');
const { populateDBForAuthentication } = require('./authenticationSeed');
const {
  TRANSITION,
  TITLE_TEXT_MEDIA,
  TITLE_TEXT,
  TEXT_MEDIA,
  FLASHCARD,
  FILL_THE_GAPS,
  MULTIPLE_CHOICE_QUESTION,
  SINGLE_CHOICE_QUESTION,
  ORDER_THE_SEQUENCE,
} = require('../../../src/helpers/constants');

const cardsList = [
  { _id: new ObjectID(), template: TRANSITION, title: 'Lala' },
  { _id: new ObjectID(), template: TITLE_TEXT_MEDIA },
  { _id: new ObjectID(), template: TITLE_TEXT },
  { _id: new ObjectID(), template: TEXT_MEDIA },
  { _id: new ObjectID(), template: FLASHCARD },
  { _id: new ObjectID(), template: FILL_THE_GAPS, answers: [{ label: 'le papa' }, { label: 'la maman' }] },
  { _id: new ObjectID(), template: MULTIPLE_CHOICE_QUESTION },
  { _id: new ObjectID(), template: SINGLE_CHOICE_QUESTION },
  { _id: new ObjectID(), template: ORDER_THE_SEQUENCE },
];


const populateDB = async () => {
  await Card.deleteMany({});

  await populateDBForAuthentication();

  await Card.insertMany(cardsList);
};

module.exports = {
  populateDB,
  cardsList,
};
