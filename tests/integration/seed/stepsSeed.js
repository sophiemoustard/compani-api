const { ObjectID } = require('mongodb');
const Program = require('../../../src/models/Program');
const Step = require('../../../src/models/Step');
const Activity = require('../../../src/models/Activity');
const Card = require('../../../src/models/Card');
const { populateDBForAuthentication } = require('./authenticationSeed');

const cardsList = [
  { _id: new ObjectID(), template: 'transition', title: 'do mi sol do' },
  { _id: new ObjectID(), template: 'fill_the_gaps' },
];

const activitiesList = [
  { _id: new ObjectID(), type: 'lesson', name: 'chanter', cards: [cardsList[0]] },
  { _id: new ObjectID(), type: 'video', name: 'gater le coin', cards: [cardsList[0]] },
  { _id: new ObjectID(), type: 'lesson', name: 'douche', cards: [cardsList[1]] },
  { _id: new ObjectID(), type: 'lesson', name: 'published activity', status: 'published', cards: [cardsList[0]] },
];

const stepsList = [
  {
    _id: new ObjectID(),
    type: 'on_site',
    name: 'c\'est une étape',
    activities: [activitiesList[1]._id, activitiesList[2]._id],
  },
  { _id: new ObjectID(), type: 'e_learning', name: 'toujours une étape', activities: [activitiesList[0]._id] },
  { _id: new ObjectID(), type: 'e_learning', name: 'encore une étape' },
  {
    _id: new ObjectID(),
    type: 'e_learning',
    name: 'Etape publiée',
    status: 'published',
    activities: [activitiesList[3]._id],
  },
];

const programsList = [
  { _id: new ObjectID(), name: 'program', steps: [stepsList[0]._id, stepsList[1]._id] },
  { _id: new ObjectID(), name: 'training program', steps: [stepsList[2]._id] },
];

const populateDB = async () => {
  await Program.deleteMany({});
  await Step.deleteMany({});
  await Activity.deleteMany({});
  await Card.deleteMany({});

  await populateDBForAuthentication();

  await Program.insertMany(programsList);
  await Step.insertMany(stepsList);
  await Activity.insertMany(activitiesList);
  await Card.insertMany(cardsList);
};

module.exports = {
  populateDB,
  stepsList,
  activitiesList,
  cardsList,
};
