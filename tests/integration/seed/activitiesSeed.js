const { ObjectID } = require('mongodb');
const Program = require('../../../src/models/Program');
const SubProgram = require('../../../src/models/SubProgram');
const Step = require('../../../src/models/Step');
const Activity = require('../../../src/models/Activity');
const Card = require('../../../src/models/Card');
const { populateDBForAuthentication } = require('./authenticationSeed');
const { TRANSITION, FLASHCARD, TITLE_TEXT, TITLE_TEXT_MEDIA } = require('../../../src/helpers/constants');

const cardsList = [
  { _id: new ObjectID(), template: TRANSITION, title: 'ceci est un titre' },
  { _id: new ObjectID(), template: TITLE_TEXT, title: 'ceci est un titre', text: 'test' },
  {
    _id: new ObjectID(),
    template: TITLE_TEXT_MEDIA,
    title: 'ceci est un titre',
    text: 'text',
    media: { link: 'lien', publicId: 'id' },
  },
  { _id: new ObjectID(), template: FLASHCARD, backText: 'ceci est un backText', text: 'ceci est un text' },
];

const activitiesList = [
  {
    _id: new ObjectID(),
    name: 'manger',
    type: 'quiz',
    cards: [cardsList[0]._id, cardsList[1]._id, cardsList[2]._id, cardsList[3]._id],
  },
  { _id: new ObjectID(), name: 'bouger', type: 'lesson' },
  { _id: new ObjectID(), name: 'fumer', type: 'video' },
  { _id: new ObjectID(), name: 'publiée', type: 'video', status: 'published' },
];

const stepsList = [
  {
    _id: new ObjectID(),
    type: 'e_learning',
    name: 'rouge',
    activities: [activitiesList[0]._id, activitiesList[1]._id],
  },
  { _id: new ObjectID(), type: 'on_site', name: 'bleu', activities: [activitiesList[2]._id] },
];

const subProgramsList = [{ _id: new ObjectID(), name: '2_7_4124', steps: [stepsList[0]._id] }];

const programsList = [{ _id: new ObjectID(), name: 'au programme télévisé', subPrograms: [subProgramsList[0]._id] }];

const populateDB = async () => {
  await Program.deleteMany({});
  await SubProgram.deleteMany({});
  await Step.deleteMany({});
  await Activity.deleteMany({});
  await Card.deleteMany({});

  await populateDBForAuthentication();

  await Program.insertMany(programsList);
  await SubProgram.insertMany(subProgramsList);
  await Step.insertMany(stepsList);
  await Activity.insertMany(activitiesList);
  await Card.insertMany(cardsList);
};

module.exports = {
  populateDB,
  cardsList,
  activitiesList,
  stepsList,
  subProgramsList,
  programsList,
};
