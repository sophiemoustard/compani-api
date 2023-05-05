const { ObjectId } = require('mongodb');
const Card = require('../../../src/models/Card');
const Activity = require('../../../src/models/Activity');
const Questionnaire = require('../../../src/models/Questionnaire');
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
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');

const cardsList = [
  { _id: new ObjectId(), template: TRANSITION, title: 'Lala' },
  { _id: new ObjectId(), template: TITLE_TEXT_MEDIA, media: { type: 'video', link: 'link', publicId: 'publicId' } },
  { _id: new ObjectId(), template: TITLE_TEXT },
  { _id: new ObjectId(), template: TEXT_MEDIA },
  { _id: new ObjectId(), template: FLASHCARD, text: 'text', backText: 'back text' },
  {
    _id: new ObjectId(),
    template: FILL_THE_GAPS,
    falsyGapAnswers: [{ _id: new ObjectId(), text: 'ase' }, { _id: new ObjectId(), text: 'énué' }],
  },
  {
    _id: new ObjectId(),
    template: MULTIPLE_CHOICE_QUESTION,
    qcAnswers: [
      { _id: new ObjectId(), correct: false, text: 'mex' },
      { _id: new ObjectId(), correct: true, text: 'Avery' },
      { _id: new ObjectId(), correct: true, text: 'erne' },
      { _id: new ObjectId(), correct: true, text: 'j\'ai pas d\'autres jeux de mots' },
    ],
    question: 'what is the question ?',
  },
  {
    _id: new ObjectId(),
    template: SINGLE_CHOICE_QUESTION,
    qcAnswers: [
      { _id: new ObjectId(), text: 'uel' },
      { _id: new ObjectId(), text: 'ile' },
      { _id: new ObjectId(), text: 'o' },
    ],
    question: 'what is the question ?',
  },
  {
    _id: new ObjectId(),
    template: ORDER_THE_SEQUENCE,
    orderedAnswers: [
      { _id: new ObjectId(), text: 'rien' },
      { _id: new ObjectId(), text: 'des trucs' },
      { _id: new ObjectId(), text: 'encore des trucs' },
    ],
  },
  { _id: new ObjectId(), template: SURVEY },
  { _id: new ObjectId(), template: OPEN_QUESTION },
  {
    _id: new ObjectId(),
    template: QUESTION_ANSWER,
    qcAnswers: [{ text: 'hallo', _id: new ObjectId() }, { text: 'shalom', _id: new ObjectId() }],
  },
  {
    _id: new ObjectId(),
    template: QUESTION_ANSWER,
    qcAnswers: [
      { text: 'bye bye', _id: new ObjectId() },
      { text: 'bye bye', _id: new ObjectId() },
      { text: 'bye bye', _id: new ObjectId() },
      { text: 'bye bye', _id: new ObjectId() },
    ],
  },
  {
    _id: new ObjectId(),
    template: QUESTION_ANSWER,
    question: 'what is the question ?',
    qcAnswers: [{ text: 'hallo', _id: new ObjectId() }, { text: 'shalom', _id: new ObjectId() }],
  },
  { _id: new ObjectId(), template: SINGLE_CHOICE_QUESTION, qcAnswers: [{ _id: new ObjectId(), text: 'uel' }] },
  {
    _id: new ObjectId(),
    template: MULTIPLE_CHOICE_QUESTION,
    qcAnswers: [
      { _id: new ObjectId(), correct: false, text: 'mex' },
      { _id: new ObjectId(), correct: true, text: 'Avery' },
    ],
  },
  {
    _id: new ObjectId(),
    template: ORDER_THE_SEQUENCE,
    orderedAnswers: [{ _id: new ObjectId(), text: 'rien' }, { _id: new ObjectId(), text: 'des trucs' }],
  },
  {
    _id: new ObjectId(),
    template: FILL_THE_GAPS,
    falsyGapAnswers: [
      { _id: new ObjectId(), text: 'ase' },
      { _id: new ObjectId(), text: 'énué' },
      { _id: new ObjectId(), text: 'olard' },
      { _id: new ObjectId(), text: 'ension' },
      { _id: new ObjectId(), text: 'rien' },
      { _id: new ObjectId(), text: 'des trucs' },
    ],
  },
];

const activitiesList = [
  {
    _id: new ObjectId(),
    name: 'Coucou toi',
    cards: [
      cardsList[0]._id,
      cardsList[1]._id,
      cardsList[11]._id,
      cardsList[12]._id,
      cardsList[8]._id,
      cardsList[16]._id,
      cardsList[5]._id,
      cardsList[17]._id,
    ],
    type: 'video',
    status: 'draft',
  },
  {
    _id: new ObjectId(),
    name: 'la peche',
    cards: [cardsList[4]._id, cardsList[13]._id],
    type: 'quiz',
    status: 'published',
  },
];

const questionnairesList = [
  {
    _id: new ObjectId(),
    name: 'test',
    status: 'published',
    type: 'expectations',
    cards: [cardsList[6]._id, cardsList[7]._id],
  },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    Card.create(cardsList),
    Activity.create(activitiesList),
    Questionnaire.create(questionnairesList),
  ]);
};

module.exports = {
  populateDB,
  cardsList,
};
