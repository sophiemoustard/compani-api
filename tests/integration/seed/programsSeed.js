const { ObjectID } = require('mongodb');
const Program = require('../../../src/models/Program');
const SubProgram = require('../../../src/models/SubProgram');
const Step = require('../../../src/models/Step');
const Activity = require('../../../src/models/Activity');
const Category = require('../../../src/models/Category');
const ActivityHistory = require('../../../src/models/ActivityHistory');
const Card = require('../../../src/models/Card');
const Course = require('../../../src/models/Course');
const { populateDBForAuthentication } = require('./authenticationSeed');
const { userList } = require('../../seed/userSeed');
const { rolesList } = require('../../seed/roleSeed');

const cards = [
  { _id: new ObjectID(), template: 'transition', title: 'skusku' },
  { _id: new ObjectID(), template: 'transition' },
];

const activitiesList = [
  { _id: new ObjectID(), name: 'c\'est une activité', type: 'sharing_experience', cards: [cards[0]._id] },
  { _id: new ObjectID(), name: 'toujours une activité', type: 'quiz', cards: [cards[1]._id] },
];

const categoriesList = [
  { _id: new ObjectID(), name: 'ma première catégorie' },
  { _id: new ObjectID(), name: 'ma seconde catégorie' },
];

const vendorAdminRole = rolesList.find(role => role.name === 'vendor_admin')._id;
const vendorAdmin = userList.find(user => user.role.vendor === vendorAdminRole);
const activityHistoriesList = [
  { _id: new ObjectID(), user: vendorAdmin._id, activity: activitiesList[0]._id },
];

const stepsList = [
  {
    _id: new ObjectID(),
    type: 'e_learning',
    name: 'c\'est une étape',
    activities: [activitiesList[0]._id, activitiesList[1]._id],
  },
  { _id: new ObjectID(), type: 'e_learning', name: 'toujours une étape', activities: [activitiesList[0]._id] },
  { _id: new ObjectID(), type: 'on_site', name: 'encore une étape', activities: [activitiesList[0]._id] },
  { _id: new ObjectID(), type: 'on_site', name: 'encore une étape', activities: [activitiesList[1]._id] },
];

const subProgramsList = [
  { _id: new ObjectID(), name: 'c\'est un sous-programme', steps: [stepsList[2]._id] },
  { _id: new ObjectID(), name: 'c\'est un sous-programme', steps: [stepsList[3]._id] },
  { _id: new ObjectID(), name: 'c\'est un sous-programme elearning', steps: [stepsList[1]._id] },
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
  { _id: new ObjectID(), name: 'training program', subPrograms: [subProgramsList[2]._id] },
  { _id: new ObjectID(), name: 'non valid program', subPrograms: [subProgramsList[1]._id] },
];

const course = {
  _id: new ObjectID(),
  subProgram: subProgramsList[2]._id,
  misc: 'first session',
  type: 'inter_b2c',
  trainer: new ObjectID(),
  format: 'strictly_e_learning',
  trainees: [userList[0]._id],
};

const populateDB = async () => {
  await Program.deleteMany({});
  await SubProgram.deleteMany({});
  await Step.deleteMany({});
  await Activity.deleteMany({});
  await Category.deleteMany({});
  await ActivityHistory.deleteMany({});
  await Card.deleteMany({});
  await Course.deleteMany({});

  await populateDBForAuthentication();

  await SubProgram.insertMany(subProgramsList);
  await Program.insertMany(programsList);
  await Step.insertMany(stepsList);
  await Activity.insertMany(activitiesList);
  await Category.insertMany(categoriesList);
  await ActivityHistory.insertMany(activityHistoriesList);
  await Card.insertMany(cards);
  await new Course(course).save();
};

module.exports = {
  populateDB,
  programsList,
  subProgramsList,
  course,
  activitiesList,
  activityHistoriesList,
  categoriesList,
};
