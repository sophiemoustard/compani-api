const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const { ObjectID } = require('mongodb');
const Course = require('../../../src/models/Course');
const Program = require('../../../src/models/Program');
const SubProgram = require('../../../src/models/SubProgram');
const CourseSlot = require('../../../src/models/CourseSlot');
const CourseSmsHistory = require('../../../src/models/CourseSmsHistory');
const User = require('../../../src/models/User');
const Step = require('../../../src/models/Step');
const Activity = require('../../../src/models/Activity');
const ActivityHistory = require('../../../src/models/ActivityHistory');
const Card = require('../../../src/models/Card');
const { populateDBForAuthentication, authCompany, otherCompany, rolesList, userList } = require('./authenticationSeed');
const {
  AUXILIARY,
  HELPER,
  AUXILIARY_WITHOUT_COMPANY,
  CLIENT_ADMIN,
  TRAINING_ORGANISATION_MANAGER,
  COACH,
  VIDEO,
} = require('../../../src/helpers/constants.js');

const auxiliary = userList.find(user => user.role.client === rolesList.find(role => role.name === AUXILIARY)._id);
const helper = userList.find(user => user.role.client === rolesList.find(role => role.name === HELPER)._id);
const auxiliaryWithoutCompany = userList
  .find(user => user.role.client === rolesList.find(role => role.name === AUXILIARY_WITHOUT_COMPANY)._id);
const clientAdmin = userList
  .find(user => user.role.client === rolesList.find(role => role.name === CLIENT_ADMIN)._id);
const trainerOrganisationManager = userList
  .find(user => user.role.vendor === rolesList.find(role => role.name === TRAINING_ORGANISATION_MANAGER)._id);
const coachFromAuthCompany = userList
  .find(user => user.role.client === rolesList.find(role => role.name === COACH)._id);

const traineeFromOtherCompany = {
  _id: new ObjectID(),
  identity: { firstname: 'Fred', lastname: 'Astaire' },
  local: { email: 'traineeAuthCompany@alenvi.io', password: '123456!eR' },
  role: { client: rolesList.find(role => role.name === 'auxiliary')._id },
  contact: { phone: '0734856751' },
  refreshToken: uuidv4(),
  company: otherCompany._id,
  inactivityDate: null,
};

const traineeWithoutCompany = {
  _id: new ObjectID(),
  identity: { firstname: 'Salut', lastname: 'Toi' },
  local: { email: 'traineeWithoutCompany@alenvi.io', password: '123456!eR' },
  role: { vendor: rolesList.find(role => role.name === 'trainer')._id },
  refreshToken: uuidv4(),
  inactivityDate: null,
};

const courseTrainer = userList.find(user => user.role.vendor === rolesList.find(role => role.name === 'trainer')._id);

const card = { _id: ObjectID(), template: 'title_text' };

const activity = { _id: new ObjectID(), name: 'KennyIsAwesome', type: VIDEO, cards: [card._id] };
const activitiesHistory = [
  { _id: new ObjectID(), user: coachFromAuthCompany._id, activity: activity._id },
  { _id: new ObjectID(), user: clientAdmin._id, activity: activity._id },
];

const step = {
  _id: new ObjectID(),
  name: 'etape',
  type: 'on_site',
  activities: [{ _id: activity._id, name: activity.name, type: activity.type }],
};

const subProgramsList = [
  {
    _id: new ObjectID(),
    name: 'sous-programme',
    steps: [step._id],
  },
];

const programsList = [
  {
    _id: new ObjectID(),
    name: 'program',
    learningGoals: 'on est là',
    image: { link: 'belle/url', publicId: '12345' },
    subPrograms: [subProgramsList[0]._id],
  },
  { _id: new ObjectID(), name: 'training program', image: { link: 'belle/url', publicId: '12345' } },
];

const coursesList = [
  {
    _id: new ObjectID(),
    subProgram: subProgramsList[0]._id,
    company: authCompany._id,
    misc: 'first session',
    trainer: courseTrainer._id,
    trainees: [coachFromAuthCompany._id, helper._id, clientAdmin._id, courseTrainer._id],
    type: 'intra',
    format: 'blended',
  },
  {
    _id: new ObjectID(),
    subProgram: subProgramsList[0]._id,
    company: otherCompany._id,
    misc: 'team formation',
    trainer: new ObjectID(),
    trainees: [traineeFromOtherCompany._id],
    type: 'intra',
    format: 'blended',
  },
  {
    _id: new ObjectID(),
    subProgram: subProgramsList[0]._id,
    company: authCompany._id,
    misc: 'second session',
    trainer: courseTrainer._id,
    type: 'intra',
    trainees: [coachFromAuthCompany._id, helper._id, trainerOrganisationManager._id, clientAdmin._id, auxiliary._id],
    format: 'blended',
  },
  {
    _id: new ObjectID(),
    subProgram: subProgramsList[0]._id,
    company: otherCompany._id,
    misc: 'second team formation',
    trainer: new ObjectID(),
    type: 'intra',
    trainees: [coachFromAuthCompany._id, clientAdmin._id],
    format: 'blended',
  },
  {
    _id: new ObjectID(),
    subProgram: subProgramsList[0]._id,
    misc: 'inter b2b session concerning auth company',
    type: 'inter_b2b',
    trainees: [traineeFromOtherCompany._id, coachFromAuthCompany._id],
    format: 'blended',
  },
  {
    _id: new ObjectID(),
    subProgram: subProgramsList[0]._id,
    misc: 'inter b2b session NOT concerning auth company',
    type: 'inter_b2b',
    trainees: [traineeFromOtherCompany._id],
    format: 'blended',
  },
];

const courseSmsHistory = {
  date: '2020-01-01T00:00:00.000Z',
  type: 'convocation',
  message: 'Hola ! This is a test',
  course: coursesList[0]._id,
  sender: courseTrainer._id,
};

const slots = [
  {
    startDate: moment('2020-03-20T09:00:00').toDate(),
    endDate: moment('2020-03-20T11:00:00').toDate(),
    courseId: coursesList[0],
    step: step._id,
  },
  {
    startDate: moment('2020-03-20T14:00:00').toDate(),
    endDate: moment('2020-03-20T18:00:00').toDate(),
    courseId: coursesList[0],
    step: step._id,
  },
  {
    startDate: moment('2020-03-20T09:00:00').toDate(),
    endDate: moment('2020-03-20T11:00:00').toDate(),
    courseId: coursesList[1],
    step: step._id,
  },
  {
    startDate: moment('2020-03-20T09:00:00').toDate(),
    endDate: moment('2020-03-20T11:00:00').toDate(),
    courseId: coursesList[2],
    step: step._id,
  },
  {
    startDate: moment('2020-03-20T09:00:00').toDate(),
    endDate: moment('2020-03-20T11:00:00').toDate(),
    courseId: coursesList[3],
    step: step._id,
  },
  { courseId: coursesList[3] },
];

const populateDB = async () => {
  await Course.deleteMany({});
  await SubProgram.deleteMany({});
  await Program.deleteMany({});
  await User.deleteMany({});
  await CourseSlot.deleteMany({});
  await CourseSmsHistory.deleteMany({});
  await Step.deleteMany({});
  await Activity.deleteMany({});
  await Card.deleteMany({});
  await ActivityHistory.deleteMany({});

  await populateDBForAuthentication();

  await SubProgram.insertMany(subProgramsList);
  await Program.insertMany(programsList);
  await Course.insertMany(coursesList);
  await CourseSlot.insertMany(slots);
  await User.create([traineeFromOtherCompany, traineeWithoutCompany]);
  await CourseSmsHistory.create(courseSmsHistory);
  await Step.create(step);
  await Activity.create(activity);
  await Card.create(card);
  await ActivityHistory.insertMany(activitiesHistory);
};

module.exports = {
  populateDB,
  activity,
  step,
  coursesList,
  subProgramsList,
  programsList,
  auxiliary,
  coachFromAuthCompany,
  traineeFromOtherCompany,
  traineeWithoutCompany,
  courseSmsHistory,
  courseTrainer,
  helper,
  auxiliaryWithoutCompany,
  clientAdmin,
  trainerOrganisationManager,
  slots,
};
