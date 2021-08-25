const { ObjectID } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const Attendance = require('../../../src/models/Attendance');
const Course = require('../../../src/models/Course');
const CourseSlot = require('../../../src/models/CourseSlot');
const User = require('../../../src/models/User');
const UserCompany = require('../../../src/models/UserCompany');
const { otherCompany, authCompany } = require('../../seed/authCompaniesSeed');
const { WEBAPP } = require('../../../src/helpers/constants');
const { vendorAdmin } = require('../../seed/authUsersSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');
const { trainerRoleId } = require('../../seed/authRolesSeed');

const trainerList = [
  {
    _id: new ObjectID(),
    identity: { firstname: 'course', lastname: 'Trainer' },
    refreshToken: uuidv4(),
    local: { email: 'trainerWithCourse@alenvi.io', password: '123456!eR' },
    role: { vendor: trainerRoleId },
    origin: WEBAPP,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'trainer', lastname: 'noCourse' },
    refreshToken: uuidv4(),
    local: { email: 'trainerNoCourse@alenvi.io', password: '123456!eR' },
    role: { vendor: trainerRoleId },
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
    identity: { firstname: 'Trainee', lastname: 'withCompany' },
    local: { email: 'traineeWithCompany@alenvi.io', password: '123456!eR' },
    origin: WEBAPP,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Player', lastname: 'withoutCompany' },
    local: { email: 'traineeWithoutCompany@alenvi.io', password: '123456!eR' },
    origin: WEBAPP,
  },
  {
    _id: coursesList[3].trainees[0],
    identity: { firstname: 'traineeFromINTERB2B', lastname: 'otherCompany' },
    local: { email: 'traineeFromINTERB2B@alenvi.io', password: '123456!eR' },
    origin: WEBAPP,
  },
  {
    _id: coursesList[3].trainees[1],
    identity: { firstname: 'traineeFromINTERB2B', lastname: 'authCompany' },
    local: { email: 'authTraineeFromINTERB2B@alenvi.io', password: '123456!eR' },
    origin: WEBAPP,
  },
  {
    _id: coursesList[4].trainees[0],
    identity: { firstname: 'interB2Btrainee', lastname: 'withOtherCompany' },
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
  await User.create([...trainerList, ...companyTraineesList]);
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
