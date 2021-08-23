const { ObjectID } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const Attendance = require('../../../src/models/Attendance');
const Course = require('../../../src/models/Course');
const CourseSlot = require('../../../src/models/CourseSlot');
const User = require('../../../src/models/User');
const UserCompany = require('../../../src/models/UserCompany');
const { rolesList } = require('../../seed/roleSeed');
const { otherCompany } = require('../../seed/companySeed');
const { TRAINER, WEBAPP } = require('../../../src/helpers/constants');
const { vendorAdmin } = require('../../seed/userSeed');
const { authCompany } = require('./authenticationSeed');
const { deleteNonAuthenticationSeeds } = require('./initializeDB');

const trainerList = [
  {
    _id: new ObjectID(),
    identity: { firstname: 'trainer', lastname: 'withCourse' },
    refreshToken: uuidv4(),
    local: { email: 'trainerWithCourse@alenvi.io', password: '123456!eR' },
    role: { vendor: rolesList.find(role => role.name === TRAINER)._id },
    origin: WEBAPP,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'trainer', lastname: 'noCourse' },
    refreshToken: uuidv4(),
    local: { email: 'trainerNoCourse@alenvi.io', password: '123456!eR' },
    role: { vendor: rolesList.find(role => role.name === TRAINER)._id },
    origin: WEBAPP,
  },
];

const coursesList = [
  {
    _id: new ObjectID(),
    subProgram: new ObjectID(),
    company: authCompany._id,
    type: 'intra',
    trainees: [new ObjectID(), new ObjectID()],
    trainer: trainerList[0]._id,
    salesRepresentative: vendorAdmin._id,
  },
  {
    _id: new ObjectID(),
    subProgram: new ObjectID(),
    company: authCompany._id,
    type: 'intra',
    trainees: [new ObjectID()],
    trainer: trainerList[0]._id,
    salesRepresentative: vendorAdmin._id,
  },
  {
    _id: new ObjectID(),
    subProgram: new ObjectID(),
    company: otherCompany._id,
    type: 'intra',
    trainees: [new ObjectID()],
    trainer: trainerList[0]._id,
    salesRepresentative: vendorAdmin._id,
  },
  { // interb2b
    _id: new ObjectID(),
    subProgram: new ObjectID(),
    company: authCompany._id,
    type: 'inter_b2b',
    trainees: [new ObjectID(), new ObjectID()],
    trainer: trainerList[0]._id,
    salesRepresentative: vendorAdmin._id,
  },
  { // interb2b with only trainees from otherCompany
    _id: new ObjectID(),
    subProgram: new ObjectID(),
    company: authCompany._id,
    type: 'inter_b2b',
    trainees: [new ObjectID()],
    trainer: trainerList[0]._id,
    salesRepresentative: vendorAdmin._id,
  },
];

const slotsList = [
  {
    _id: new ObjectID(),
    startDate: new Date('2020-01-23').toISOString(),
    endDate: new Date('2020-01-23').toISOString(),
    course: coursesList[0],
    step: new ObjectID(),
  },
  {
    _id: new ObjectID(),
    startDate: new Date('2020-01-23').toISOString(),
    endDate: new Date('2020-01-23').toISOString(),
    course: coursesList[0],
    step: new ObjectID(),
  },
  { // slot from other company's course
    _id: new ObjectID(),
    startDate: new Date('2020-01-23').toISOString(),
    endDate: new Date('2020-01-23').toISOString(),
    course: coursesList[2],
    step: new ObjectID(),
  },
  { // slot for coursesList[3]
    _id: new ObjectID(),
    startDate: new Date('2020-01-23').toISOString(),
    endDate: new Date('2020-01-23').toISOString(),
    course: coursesList[3],
    step: new ObjectID(),
  },
  { // slot for coursesList[4]
    _id: new ObjectID(),
    startDate: new Date('2020-01-23').toISOString(),
    endDate: new Date('2020-01-23').toISOString(),
    course: coursesList[4],
    step: new ObjectID(),
  },
];

const attendancesList = [
  { _id: new ObjectID(), courseSlot: slotsList[0], trainee: coursesList[0].trainees[0] },
  { _id: new ObjectID(), courseSlot: slotsList[3], trainee: coursesList[3].trainees[0] },
  { _id: new ObjectID(), courseSlot: slotsList[3], trainee: coursesList[3].trainees[1] },
];

const companyTraineesList = [
  {
    _id: coursesList[0].trainees[1],
    identity: { firstname: 'trainee', lastname: 'withCompany' },
    local: { email: 'traineeWithCompany@alenvi.io', password: '123456!eR' },
    origin: WEBAPP,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'trainee', lastname: 'withoutCompany' },
    local: { email: 'traineeWithoutCompany@alenvi.io', password: '123456!eR' },
    origin: WEBAPP,
  },
  {
    _id: coursesList[3].trainees[0],
    identity: { firstname: 'traineeFromINTERB2B', lastname: 'withOtherCompany' },
    local: { email: 'traineeFromINTERB2B@alenvi.io', password: '123456!eR' },
    origin: WEBAPP,
  },
  {
    _id: coursesList[3].trainees[1],
    identity: { firstname: 'traineeFromINTERB2B', lastname: 'withAuthCompany' },
    local: { email: 'authTraineeFromINTERB2B@alenvi.io', password: '123456!eR' },
    origin: WEBAPP,
  },
  {
    _id: coursesList[4].trainees[0],
    identity: { firstname: 'traineeFromINTERB2B', lastname: 'withOtherCompany' },
    local: { email: 'otherTraineeFromINTERB2B@alenvi.io', password: '123456!eR' },
    origin: WEBAPP,
  },
];

const userCompanyList = [
  { user: companyTraineesList[0]._id, company: authCompany._id },
  { user: companyTraineesList[2]._id, company: otherCompany._id },
  { user: companyTraineesList[3]._id, company: authCompany._id },
  { user: companyTraineesList[4]._id, company: otherCompany._id },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Attendance.insertMany(attendancesList);
  await Course.insertMany(coursesList);
  await CourseSlot.insertMany(slotsList);
  for (const user of trainerList) {
    await (new User(user)).save();
  }
  for (const user of companyTraineesList) {
    await (new User(user)).save();
  }
  await UserCompany.insertMany(userCompanyList);
};

module.exports = {
  populateDB,
  attendancesList,
  coursesList,
  slotsList,
  trainerList,
  companyTraineesList,
  userCompanyList,
};
