const { ObjectID } = require('mongodb');
const Card = require('../../../src/models/Card');
const { populateDBForAuthentication } = require('./authenticationSeed');
const { TRANSITION, TITLE_TEXT_MEDIA, TITLE_TEXT, TEXT_MEDIA, FLASHCARD } = require('../../../src/helpers/constants');

const cardsList = [
  { _id: new ObjectID(), template: TRANSITION, title: 'Lala' },
  { _id: new ObjectID(), template: TITLE_TEXT_MEDIA },
  { _id: new ObjectID(), template: TITLE_TEXT },
  { _id: new ObjectID(), template: TEXT_MEDIA },
  { _id: new ObjectID(), template: FLASHCARD },
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
