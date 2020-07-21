const uuidv4 = require('uuid/v4');
const moment = require('moment');
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
  local: { email: 'auxiliarycourse@alenvi.io', password: '123456!eR' },
  role: { client: rolesList.find(role => role.name === 'auxiliary')._id },
  contact: { phone: '0632896751' },
  refreshToken: uuidv4(),
  company: authCompany._id,
  inactivityDate: null,
};

const helper = {
  _id: new ObjectID(),
  identity: { firstname: 'helper', lastname: 'course' },
  local: { email: 'helpercourse@alenvi.io', password: '123456!eR' },
  role: { client: rolesList.find(role => role.name === 'helper')._id },
  contact: { phone: '0632896751' },
  refreshToken: uuidv4(),
  company: authCompany._id,
  inactivityDate: null,
};

const auxiliaryWithoutCompany = {
  _id: new ObjectID(),
  identity: { firstname: 'auxiliarywithoutcompany', lastname: 'course' },
  local: { email: 'auxiliarywithoutcompanycourse@alenvi.io', password: '123456!eR' },
  role: { client: rolesList.find(role => role.name === 'auxiliary_without_company')._id },
  contact: { phone: '0632896751' },
  refreshToken: uuidv4(),
  company: authCompany._id,
  inactivityDate: null,
};

const clientAdmin = {
  _id: new ObjectID(),
  identity: { firstname: 'clientAdmin', lastname: 'course' },
  local: { email: 'clientAdmincourse@alenvi.io', password: '123456!eR' },
  role: { client: rolesList.find(role => role.name === 'client_admin')._id },
  contact: { phone: '0632896751' },
  refreshToken: uuidv4(),
  company: authCompany._id,
  inactivityDate: null,
};

const trainerOrganisationManager = {
  _id: new ObjectID(),
  identity: { firstname: 'trainingorganisationmanager', lastname: 'course' },
  local: { email: 'trainingorganisationmanagercourse@alenvi.io', password: '123456!eR' },
  role: { client: rolesList.find(role => role.name === 'training_organisation_manager')._id },
  contact: { phone: '0632896751' },
  refreshToken: uuidv4(),
  company: authCompany._id,
  inactivityDate: null,
};

const coachFromAuthCompany = {
  _id: new ObjectID(),
  identity: { firstname: 'Tata', lastname: 'Tutu' },
  local: { email: 'traineeOtherCompany@alenvi.io', password: '123456!eR' },
  role: { client: rolesList.find(role => role.name === 'coach')._id },
  contact: { phone: '0734856751' },
  refreshToken: uuidv4(),
  company: authCompany._id,
  inactivityDate: null,
};

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

const courseTrainer = {
  _id: new ObjectID(),
  identity: { firstname: 'trainer', lastname: 'trainer' },
  refreshToken: uuidv4(),
  local: { email: 'coursetrainer@alenvi.io', password: '123456!eR' },
  role: { vendor: rolesList.find(role => role.name === 'trainer')._id },
  company: authCompany._id,
};

const programsList = [
  { _id: new ObjectID(), name: 'program', learningGoals: 'on est là' },
  { _id: new ObjectID(), name: 'training program' },
];

const coursesList = [
  {
    _id: new ObjectID(),
    program: programsList[0]._id,
    company: authCompany._id,
    misc: 'first session',
    trainer: courseTrainer._id,
    trainees: [coachFromAuthCompany._id, helper._id, clientAdmin._id, courseTrainer._id],
    type: 'intra',
  },
  {
    _id: new ObjectID(),
    program: programsList[0]._id,
    company: otherCompany._id,
    misc: 'team formation',
    trainer: new ObjectID(),
    type: 'intra',
  },
  {
    _id: new ObjectID(),
    program: programsList[0]._id,
    company: authCompany._id,
    misc: 'second session',
    trainer: courseTrainer._id,
    type: 'intra',
    trainees: [coachFromAuthCompany._id, helper._id, trainerOrganisationManager._id, clientAdmin._id, auxiliary._id],
  },
  {
    _id: new ObjectID(),
    program: programsList[0]._id,
    company: otherCompany._id,
    misc: 'second team formation',
    trainer: new ObjectID(),
    type: 'intra',
    trainees: [coachFromAuthCompany._id, clientAdmin._id],
  },
  {
    _id: new ObjectID(),
    program: programsList[0]._id,
    misc: 'inter b2b session concerning auth company',
    type: 'inter_b2b',
    trainees: [traineeFromOtherCompany._id, coachFromAuthCompany._id],
  },
  {
    _id: new ObjectID(),
    program: programsList[0]._id,
    misc: 'inter b2b session NOT concerning auth company',
    type: 'inter_b2b',
    trainees: [traineeFromOtherCompany._id],
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
  { startDate: moment('2020-03-20T09:00:00').toDate(), endDate: moment('2020-03-20T11:00:00').toDate(), courseId: coursesList[0] },
  { startDate: moment('2020-03-20T14:00:00').toDate(), endDate: moment('2020-03-20T18:00:00').toDate(), courseId: coursesList[0] },
  { startDate: moment('2020-03-20T09:00:00').toDate(), endDate: moment('2020-03-20T11:00:00').toDate(), courseId: coursesList[1] },
  { startDate: moment('2020-03-20T09:00:00').toDate(), endDate: moment('2020-03-20T11:00:00').toDate(), courseId: coursesList[2] },
  { startDate: moment('2020-03-20T09:00:00').toDate(), endDate: moment('2020-03-20T11:00:00').toDate(), courseId: coursesList[3] },
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
  await User.create([
    auxiliary,
    coachFromAuthCompany,
    traineeFromOtherCompany,
    traineeWithoutCompany,
    courseTrainer,
    helper,
    auxiliaryWithoutCompany,
    clientAdmin,
    trainerOrganisationManager,
  ]);
  await CourseSmsHistory.create(courseSmsHistory);
};

module.exports = {
  populateDB,
  coursesList,
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
};
