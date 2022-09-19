const { ObjectId } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const Program = require('../../../src/models/Program');
const SubProgram = require('../../../src/models/SubProgram');
const Step = require('../../../src/models/Step');
const Activity = require('../../../src/models/Activity');
const Course = require('../../../src/models/Course');
const Card = require('../../../src/models/Card');
const CourseSlot = require('../../../src/models/CourseSlot');
const User = require('../../../src/models/User');
const { vendorAdmin } = require('../../seed/authUsersSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');
const { WEBAPP, INTRA } = require('../../../src/helpers/constants');

const tester = {
  _id: new ObjectId(),
  identity: { firstname: 'tester', lastname: 'without role' },
  refreshToken: uuidv4(),
  local: { email: 'tester.withoutrole@compani.fr', password: 'zxcvbnm' },
  contact: { phone: '0798640728' },
  origin: WEBAPP,
};

const cardsList = [
  { _id: new ObjectId(), template: 'transition', title: 'ceci est un titre' },
  { _id: new ObjectId(), template: 'transition', title: 'ceci est un titre' },
  { _id: new ObjectId(), template: 'transition', title: 'ceci est un titre' },
];

const activitiesList = [
  {
    _id: new ObjectId(),
    type: 'sharing_experience',
    name: 'activite',
    cards: [cardsList[0]._id, cardsList[1]._id, cardsList[2]._id],
  },
  {
    _id: new ObjectId(),
    type: 'sharing_experience',
    name: 'activite',
    cards: [],
  },
];

const stepsList = [
  { _id: new ObjectId(), name: 'step 0', type: 'on_site', theoreticalHours: 1 },
  { _id: new ObjectId(), name: 'step 1', type: 'e_learning', activities: [activitiesList[0]._id], theoreticalHours: 1 },
  { _id: new ObjectId(), name: 'step 2', type: 'e_learning', activities: [activitiesList[0]._id], theoreticalHours: 1 },
  { _id: new ObjectId(), name: 'step 3', type: 'e_learning', theoreticalHours: 1 },
  { _id: new ObjectId(), name: 'step 4', type: 'e_learning', activities: [activitiesList[1]._id], theoreticalHours: 1 },
  { _id: new ObjectId(), name: 'step 5 - linked to courseSlot', type: 'on_site', theoreticalHours: 0.5 },
  { // 6 - on site without theoreticalHours
    _id: new ObjectId(),
    name: 'step 6',
    type: 'on_site',
  },
  { // 7 - elearning without theoreticalHours
    _id: new ObjectId(),
    name: 'step 7',
    type: 'e_learning',
    activities: [activitiesList[0]._id],
  },
];

const subProgramsList = [
  { _id: new ObjectId(), name: 'subProgram 0', steps: [stepsList[0]._id, stepsList[1]._id] },
  { _id: new ObjectId(), name: 'subProgram 1', steps: [stepsList[1]._id] },
  { _id: new ObjectId(), name: 'subProgram 2', status: 'published', steps: [stepsList[0]._id] },
  { _id: new ObjectId(), name: 'subProgram 3', status: 'draft', steps: [stepsList[2]._id] },
  { _id: new ObjectId(), name: 'subProgram 4', status: 'published', steps: [stepsList[2]._id] },
  { _id: new ObjectId(), name: 'subProgram 5', status: 'draft', steps: [stepsList[3]._id] },
  { _id: new ObjectId(), name: 'subProgram 6', status: 'draft', steps: [stepsList[4]._id, stepsList[5]._id] },
  { _id: new ObjectId(), name: 'subProgram 7', status: 'draft', steps: [stepsList[0]._id, stepsList[5]._id] },
  { // 8 on site without theoreticalHours
    _id: new ObjectId(),
    name: 'subProgram 8',
    status: 'draft',
    steps: [stepsList[6]._id],
  },
  { // 9 eLearning without theoreticalHours
    _id: new ObjectId(),
    name: 'subProgram 9',
    status: 'draft',
    steps: [stepsList[7]._id],
  },
];

const programsList = [
  { _id: new ObjectId(), name: 'program 1', subPrograms: [subProgramsList[0]._id, subProgramsList[1]._id] },
  {
    _id: new ObjectId(),
    name: 'program 2',
    subPrograms: [subProgramsList[3]._id, subProgramsList[4]._id],
    image: 'link',
    testers: [tester._id],
  },
];

const coursesList = [{
  _id: new ObjectId(),
  format: 'strictly_e_learning',
  subProgram: subProgramsList[7]._id,
  type: INTRA,
  maxTrainees: 8,
  company: new ObjectId(),
  salesRepresentative: vendorAdmin._id,
}];

const courseSlotsList = [
  {
    _id: new ObjectId(),
    startDate: '2020-03-10T09:00:00.000Z',
    endDate: '2020-03-10T12:00:00.000Z',
    course: coursesList[0]._id,
    step: stepsList[5]._id,
  },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    Activity.create(activitiesList),
    Card.create(cardsList),
    Course.create(coursesList),
    CourseSlot.create(courseSlotsList),
    Program.create(programsList),
    Step.create(stepsList),
    SubProgram.create(subProgramsList),
    User.create(tester),
  ]);
};

module.exports = {
  populateDB,
  subProgramsList,
  stepsList,
  activitiesList,
  cardsList,
  tester,
};
