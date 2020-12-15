const { ObjectID } = require('mongodb');
const Card = require('../../../src/models/Card');
const Activity = require('../../../src/models/Activity');
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
  SURVEY,
  OPEN_QUESTION,
  QUESTION_ANSWER,
} = require('../../../src/helpers/constants');

const cardsList = [
  { _id: new ObjectID(), template: TRANSITION, title: 'Lala' },
  { _id: new ObjectID(), template: TITLE_TEXT_MEDIA, media: { type: 'video', link: 'link', publicId: 'publicId' } },
  { _id: new ObjectID(), template: TITLE_TEXT },
  { _id: new ObjectID(), template: TEXT_MEDIA },
  { _id: new ObjectID(), template: FLASHCARD },
  {
    _id: new ObjectID(),
    template: FILL_THE_GAPS,
    falsyGapAnswers: [{ _id: new ObjectID(), text: 'ase' }, { _id: new ObjectID(), text: 'énué' }],
  },
  {
    _id: new ObjectID(),
    template: MULTIPLE_CHOICE_QUESTION,
    qcAnswers: [
      { _id: new ObjectID(), correct: false, text: 'mex' },
      { _id: new ObjectID(), correct: true, text: 'Avery' },
      { _id: new ObjectID(), correct: true, text: 'erne' },
      { _id: new ObjectID(), correct: true, text: 'j\'ai pas d\'autres jeux de mots' },
    ],
  },
  {
    _id: new ObjectID(),
    template: SINGLE_CHOICE_QUESTION,
    qcAnswers: [
      { _id: new ObjectID(), text: 'uel' },
      { _id: new ObjectID(), text: 'ile' },
      { _id: new ObjectID(), text: 'o' },
    ],
  },
  {
    _id: new ObjectID(),
    template: ORDER_THE_SEQUENCE,
    orderedAnswers: [
      { _id: new ObjectID(), text: 'rien' },
      { _id: new ObjectID(), text: 'des trucs' },
      { _id: new ObjectID(), text: 'encore des trucs' },
    ],
  },
  { _id: new ObjectID(), template: SURVEY },
  { _id: new ObjectID(), template: OPEN_QUESTION },
  {
    _id: new ObjectID(),
    template: QUESTION_ANSWER,
    qcAnswers: [{ text: 'hallo', _id: new ObjectID() }, { text: 'shalom', _id: new ObjectID() }],
  },
  {
    _id: new ObjectID(),
    template: QUESTION_ANSWER,
    qcAnswers: [
      { text: 'bye bye', _id: new ObjectID() },
      { text: 'bye bye', _id: new ObjectID() },
      { text: 'bye bye', _id: new ObjectID() },
      { text: 'bye bye', _id: new ObjectID() },
    ],
  },
  {
    _id: new ObjectID(),
    template: QUESTION_ANSWER,
    qcAnswers: [{ text: 'hallo', _id: new ObjectID() }, { text: 'shalom', _id: new ObjectID() }],
  },
  { _id: new ObjectID(), template: SINGLE_CHOICE_QUESTION, qcAnswers: [{ _id: new ObjectID(), text: 'uel' }] },
  {
    _id: new ObjectID(),
    template: MULTIPLE_CHOICE_QUESTION,
    qcAnswers: [
      { _id: new ObjectID(), correct: false, text: 'mex' },
      { _id: new ObjectID(), correct: true, text: 'Avery' },
    ],
  },
  {
    _id: new ObjectID(),
    template: ORDER_THE_SEQUENCE,
    orderedAnswers: [
      { _id: new ObjectID(), text: 'rien' },
      { _id: new ObjectID(), text: 'des trucs' },
    ],
  },
];

const activitiesList = [
  {
    _id: new ObjectID(),
    name: 'Coucou toi',
    cards: [
      cardsList[0]._id,
      cardsList[1]._id,
      cardsList[11]._id,
      cardsList[12]._id,
      cardsList[8]._id,
      cardsList[16]._id,
    ],
    type: 'video',
    status: 'draft',
  },
  {
    _id: new ObjectID(),
    name: 'la peche',
    cards: [cardsList[4]._id, cardsList[5]._id, cardsList[13]._id],
    type: 'quiz',
    status: 'published',
  },
];

const populateDB = async () => {
  await Card.deleteMany({});
  await Activity.deleteMany({});

  await populateDBForAuthentication();

  await Card.insertMany(cardsList);
  await Activity.create(activitiesList);
};

module.exports = {
  populateDB,
  cardsList,
  activitiesList,
};
