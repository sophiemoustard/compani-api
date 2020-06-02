const uuidv4 = require('uuid/v4');
const { ObjectID } = require('mongodb');
const Course = require('../../../src/models/Course');
const Program = require('../../../src/models/Program');
const CourseSlot = require('../../../src/models/CourseSlot');
const CourseSmsHistory = require('../../../src/models/CourseSmsHistory');
const User = require('../../../src/models/User');
const { populateDBForAuthentication, authCompany, otherCompany, rolesList } = require('./authenticationSeed');

const auxiliary = {
  _id: new ObjectID(),
  identity: { firstname: 'test', lastname: 'toto' },
  local: { email: 'othercompanyauxiliary@alenvi.io', password: '123456!eR' },
  role: { client: rolesList.find(role => role.name === 'auxiliary')._id },
  contact: { phone: '0632896751' },
  refreshToken: uuidv4(),
  company: authCompany._id,
  inactivityDate: null,
};

const trainee = {
  _id: new ObjectID(),
  identity: { firstname: 'Tata', lastname: 'Tutu' },
  local: { email: 'trainee@alenvi.io', password: '123456!eR' },
  role: { client: rolesList.find(role => role.name === 'auxiliary')._id },
  contact: { phone: '0734856751' },
  refreshToken: uuidv4(),
  company: authCompany._id,
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

const courseTrainer = {
  _id: new ObjectID(),
  identity: { firstname: 'trainer', lastname: 'trainer' },
  refreshToken: uuidv4(),
  local: { email: 'coursetrainer@alenvi.io', password: '123456!eR' },
  role: { vendor: rolesList.find(role => role.name === 'trainer')._id },
  company: authCompany._id,
};

const programsList = [
  { _id: new ObjectID(), name: 'program' },
  { _id: new ObjectID(), name: 'training program' },
];

const coursesList = [
  {
    _id: new ObjectID(),
    name: 'first session',
    program: programsList[0]._id,
    company: authCompany._id,
    trainer: courseTrainer._id,
    type: 'intra',
  },
  {
    _id: new ObjectID(),
    name: 'team formation',
    program: programsList[0]._id,
    company: otherCompany._id,
    trainer: new ObjectID(),
    type: 'intra',
  },
  {
    _id: new ObjectID(),
    name: 'second session',
    program: programsList[0]._id,
    company: authCompany._id,
    trainer: courseTrainer._id,
    type: 'intra',
    trainees: [trainee._id],
  },
  {
    _id: new ObjectID(),
    name: 'second team formation',
    program: programsList[0]._id,
    company: otherCompany._id,
    trainer: new ObjectID(),
    type: 'intra',
    trainees: [trainee._id],
  },
  {
    _id: new ObjectID(),
    name: 'inter b2b session',
    program: programsList[0]._id,
    type: 'inter_b2b',
    trainees: [trainee._id],
  },
];

const courseSmsHistory = {
  date: '2020-01-01T00:00:00.000Z',
  type: 'convocation',
  message: 'Hola ! This is a test',
  course: coursesList[0]._id,
};

const slots = [
  { startDate: '2020-03-20T09:00:00', endDate: '2020-03-20T11:00:00', courseId: coursesList[0] },
  { startDate: '2020-03-20T14:00:00', endDate: '2020-03-20T18:00:00', courseId: coursesList[0] },
  { startDate: '2020-03-20T09:00:00', endDate: '2020-03-20T11:00:00', courseId: coursesList[1] },
  { startDate: '2020-03-20T09:00:00', endDate: '2020-03-20T11:00:00', courseId: coursesList[2] },
  { startDate: '2020-03-20T09:00:00', endDate: '2020-03-20T11:00:00', courseId: coursesList[3] },
];

const populateDB = async () => {
  await Course.deleteMany({});
  await Program.deleteMany({});
  await User.deleteMany({});
  await CourseSlot.deleteMany({});
  await CourseSmsHistory.deleteMany({});

  await populateDBForAuthentication();

  await Program.insertMany(programsList);
  await Course.insertMany(coursesList);
  await CourseSlot.insertMany(slots);
  await User.create([auxiliary, trainee, traineeWithoutCompany, courseTrainer]);
  await CourseSmsHistory.create(courseSmsHistory);
};

module.exports = {
  populateDB,
  coursesList,
  programsList,
  auxiliary,
  trainee,
  traineeWithoutCompany,
  courseSmsHistory,
  courseTrainer,
};
