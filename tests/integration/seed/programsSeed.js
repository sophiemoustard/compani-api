const { ObjectID } = require('mongodb');
const Program = require('../../../src/models/Program');
const SubProgram = require('../../../src/models/SubProgram');
const Step = require('../../../src/models/Step');
const Activity = require('../../../src/models/Activity');
const Category = require('../../../src/models/Category');
const ActivityHistory = require('../../../src/models/ActivityHistory');
const Card = require('../../../src/models/Card');
const Course = require('../../../src/models/Course');
const { userList, vendorAdmin, trainerOrganisationManager } = require('../../seed/authUsersSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');

const cards = [
  { _id: new ObjectID(), template: 'transition', title: 'skusku' },
  { _id: new ObjectID(), template: 'transition' },
];

const activitiesList = [
  { _id: new ObjectID(), name: 'activité 1', type: 'sharing_experience', cards: [cards[0]._id] },
  { _id: new ObjectID(), name: 'activité 2', type: 'quiz', cards: [cards[1]._id] },
  { _id: new ObjectID(), name: 'activité 3', type: 'quiz', cards: [] },
];

const categoriesList = [
  { _id: new ObjectID(), name: 'ma première catégorie' },
  { _id: new ObjectID(), name: 'ma seconde catégorie' },
];

const activityHistoriesList = [
  { _id: new ObjectID(), user: vendorAdmin._id, activity: activitiesList[0]._id },
];

const stepsList = [
  {
    _id: new ObjectID(),
    type: 'e_learning',
    name: 'étape 1',
    activities: [activitiesList[0]._id, activitiesList[1]._id],
  },
  { _id: new ObjectID(), type: 'e_learning', name: 'étape 2', activities: [activitiesList[0]._id] },
  { _id: new ObjectID(), type: 'on_site', name: 'étape 3 - sans act', activities: [] },
  { _id: new ObjectID(), type: 'on_site', name: 'étape 4 - tout valide', activities: [activitiesList[0]._id] },
  { _id: new ObjectID(), type: 'on_site', name: 'étape 5 - carte non valide', activities: [activitiesList[1]._id] },
  { _id: new ObjectID(), type: 'on_site', name: 'étape 6 - sans carte', activities: [activitiesList[2]._id] },
  { _id: new ObjectID(), type: 'e_learning', name: 'étape 7 - sans act', activities: [] },
  { _id: new ObjectID(), type: 'e_learning', name: 'étape 8 - tout valide', activities: [activitiesList[0]._id] },
  { _id: new ObjectID(), type: 'e_learning', name: 'étape 9 - carte non valide', activities: [activitiesList[1]._id] },
  { _id: new ObjectID(), type: 'e_learning', name: 'étape 10 - sans carte', activities: [activitiesList[2]._id] },
  { _id: new ObjectID(), type: 'remote', name: 'étape 11 - sans act', activities: [] },
  { _id: new ObjectID(), type: 'remote', name: 'étape 12 - tout valide', activities: [activitiesList[0]._id] },
  { _id: new ObjectID(), type: 'remote', name: 'étape 13 - carte non valide', activities: [activitiesList[1]._id] },
  { _id: new ObjectID(), type: 'remote', name: 'étape 14 - sans carte', activities: [activitiesList[2]._id] },
];

const subProgramsList = [
  { _id: new ObjectID(), name: 'sous-programme 1', steps: [stepsList[2]._id] },
  { _id: new ObjectID(), name: 'sous-programme 2', steps: [stepsList[3]._id] },
  { _id: new ObjectID(), name: 'sous-programme 3', steps: [stepsList[1]._id] },
  {
    _id: new ObjectID(),
    name: 'sous-programme 4',
    steps: [
      stepsList[2]._id,
      stepsList[3]._id,
      stepsList[4]._id,
      stepsList[5]._id,
      stepsList[6]._id,
      stepsList[7]._id,
      stepsList[8]._id,
      stepsList[9]._id,
      stepsList[10]._id,
      stepsList[11]._id,
      stepsList[12]._id,
      stepsList[13]._id,
    ],
  },
];

const programsList = [
  {
    _id: new ObjectID(),
    name: 'program',
    description: 'Je suis un super programme',
    learningGoals: 'Tellement cool ce qu\'on va apprendre ensemble',
    subPrograms: [subProgramsList[0]._id],
    image: { link: 'bonjour', publicId: 'au revoir' },
    categories: [categoriesList[0]._id],
  },
  {
    _id: new ObjectID(),
    name: 'training program',
    subPrograms: [subProgramsList[2]._id],
    testers: [trainerOrganisationManager._id],
  },
  {
    _id: new ObjectID(),
    name: 'Je suis un programme eLearning',
    description: 'Vous apprendrez plein de choses',
    subPrograms: [subProgramsList[2]._id],
  },
  { _id: new ObjectID(), name: 'non valid program', subPrograms: [subProgramsList[1]._id] },
  { _id: new ObjectID(), name: 'programme a vérifier', subPrograms: [subProgramsList[3]._id] },
];

const course = {
  _id: new ObjectID(),
  subProgram: subProgramsList[2]._id,
  misc: 'first session',
  type: 'inter_b2c',
  trainer: new ObjectID(),
  format: 'strictly_e_learning',
  trainees: [userList[0]._id],
  salesRepresentative: vendorAdmin._id,
};

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await SubProgram.insertMany(subProgramsList);
  await Program.insertMany(programsList);
  await Step.insertMany(stepsList);
  await Activity.insertMany(activitiesList);
  await Category.insertMany(categoriesList);
  await ActivityHistory.insertMany(activityHistoriesList);
  await Card.insertMany(cards);
  await Course.create(course);
};

module.exports = {
  populateDB,
  programsList,
  subProgramsList,
  course,
  activitiesList,
  activityHistoriesList,
  categoriesList,
  vendorAdmin,
};
