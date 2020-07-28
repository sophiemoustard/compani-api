const { ObjectID } = require('mongodb');
const Card = require('../../../src/models/Card');
const { populateDBForAuthentication } = require('./authenticationSeed');
const { TRANSITION, TITLE_TEXT_MEDIA } = require('../../../src/helpers/constants');

const cardsList = [
  { _id: new ObjectID(), template: TRANSITION, title: 'Lala' },
  { _id: new ObjectID(), template: TITLE_TEXT_MEDIA },
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
