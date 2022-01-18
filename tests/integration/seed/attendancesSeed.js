const { ObjectId } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const Attendance = require('../../../src/models/Attendance');
const Course = require('../../../src/models/Course');
const CourseSlot = require('../../../src/models/CourseSlot');
const Program = require('../../../src/models/Program');
const SubProgram = require('../../../src/models/SubProgram');
const User = require('../../../src/models/User');
const UserCompany = require('../../../src/models/UserCompany');
const { otherCompany, authCompany } = require('../../seed/authCompaniesSeed');
const { WEBAPP } = require('../../../src/helpers/constants');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');
const { trainerRoleId, vendorAdminRoleId } = require('../../seed/authRolesSeed');
const { trainer } = require('../../seed/authUsersSeed');

const userList = [
  {
    _id: new ObjectId(),
    identity: { firstname: 'course', lastname: 'Trainer' },
    refreshToken: uuidv4(),
    local: { email: 'trainerWithCourse@alenvi.io', password: '123456!eR' },
    role: { vendor: trainerRoleId },
    origin: WEBAPP,
  },
  {
    _id: new ObjectId(),
    identity: { firstname: 'trainer', lastname: 'noCourse' },
    refreshToken: uuidv4(),
    local: { email: 'trainerNoCourse@alenvi.io', password: '123456!eR' },
    role: { vendor: trainerRoleId },
    origin: WEBAPP,
  },
  {
    _id: new ObjectId(),
    identity: { firstname: 'salesrep', lastname: 'noCourse' },
    refreshToken: uuidv4(),
    local: { email: 'salerep@compani.fr' },
    role: { vendor: vendorAdminRoleId },
    origin: WEBAPP,
  },
];

const subProgramId = new ObjectId();
const program = { _id: new ObjectId(), name: 'Program 1', subPrograms: [subProgramId] };
const subProgram = { _id: subProgramId, name: 'Subprogram 1', program };

const coursesList = [
  { // 0
    _id: new ObjectId(),
    subProgram: subProgramId,
    company: authCompany._id,
    type: 'intra',
    trainees: [userList[2]._id, new ObjectId()],
    trainer: userList[0]._id,
    salesRepresentative: userList[2]._id,
  },
  { // 1
    _id: new ObjectId(),
    subProgram: new ObjectId(),
    company: authCompany._id,
    type: 'intra',
    trainees: [new ObjectId()],
    trainer: userList[0]._id,
    salesRepresentative: userList[2]._id,
  },
  { // 2
    _id: new ObjectId(),
    subProgram: new ObjectId(),
    company: otherCompany._id,
    type: 'intra',
    trainees: [new ObjectId()],
    trainer: userList[0]._id,
    salesRepresentative: userList[2]._id,
  },
  { // 3 interb2b
    _id: new ObjectId(),
    subProgram: new ObjectId(),
    type: 'inter_b2b',
    trainees: [new ObjectId(), new ObjectId()],
    trainer: userList[0]._id,
    salesRepresentative: userList[2]._id,
  },
  { // 4 interb2b with only trainees from otherCompany
    _id: new ObjectId(),
    subProgram: new ObjectId(),
    type: 'inter_b2b',
    trainees: [new ObjectId()],
    trainer: userList[0]._id,
    salesRepresentative: userList[2]._id,
  },
  { // 5 archived
    _id: new ObjectId(),
    subProgram: new ObjectId(),
    company: authCompany._id,
    type: 'intra',
    trainees: [new ObjectId(), new ObjectId()],
    trainer: userList[0]._id,
    salesRepresentative: userList[2]._id,
    archivedAt: '2021-11-17T23:00:00',
  },
  { // 6 trainer is authTrainer
    _id: new ObjectId(),
    subProgram: subProgramId,
    type: 'inter_b2b',
    trainees: [new ObjectId(), new ObjectId()],
    trainer,
    salesRepresentative: userList[2]._id,
  },
];

const slotsList = [
  { // 0
    _id: new ObjectId(),
    startDate: new Date('2020-01-23').toISOString(),
    endDate: new Date('2020-01-23').toISOString(),
    course: coursesList[0],
    step: new ObjectId(),
  },
  { // 1
    _id: new ObjectId(),
    startDate: new Date('2020-01-23').toISOString(),
    endDate: new Date('2020-01-23').toISOString(),
    course: coursesList[0],
    step: new ObjectId(),
  },
  { // 2 - slot from other company's course
    _id: new ObjectId(),
    startDate: new Date('2020-01-23').toISOString(),
    endDate: new Date('2020-01-23').toISOString(),
    course: coursesList[2],
    step: new ObjectId(),
  },
  { // 3 - slot for coursesList[3]
    _id: new ObjectId(),
    startDate: new Date('2020-01-23').toISOString(),
    endDate: new Date('2020-01-23').toISOString(),
    course: coursesList[3],
    step: new ObjectId(),
  },
  { // 4 - slot for coursesList[4]
    _id: new ObjectId(),
    startDate: new Date('2020-01-23').toISOString(),
    endDate: new Date('2020-01-23').toISOString(),
    course: coursesList[4],
    step: new ObjectId(),
  },
  { // 5 - slot for coursesList[5]
    _id: new ObjectId(),
    startDate: new Date('2020-01-23').toISOString(),
    endDate: new Date('2020-01-23').toISOString(),
    course: coursesList[5],
    step: new ObjectId(),
  },
];

const attendancesList = [
  { _id: new ObjectId(), courseSlot: slotsList[0], trainee: coursesList[0].trainees[0] },
  { _id: new ObjectId(), courseSlot: slotsList[3], trainee: coursesList[3].trainees[0] },
  { _id: new ObjectId(), courseSlot: slotsList[3], trainee: coursesList[3].trainees[1] },
  { _id: new ObjectId(), courseSlot: slotsList[5], trainee: coursesList[5].trainees[1] },
  { _id: new ObjectId(), courseSlot: slotsList[0], trainee: coursesList[6].trainees[0] },
  { _id: new ObjectId(), courseSlot: slotsList[0], trainee: coursesList[6].trainees[1] },
];

const companyTraineesList = [
  {
    _id: coursesList[0].trainees[1],
    identity: { firstname: 'Trainee', lastname: 'withCompany' },
    local: { email: 'traineeWithCompany@alenvi.io' },
    origin: WEBAPP,
  },
  {
    _id: new ObjectId(),
    identity: { firstname: 'Player', lastname: 'withoutCompany' },
    local: { email: 'traineeWithoutCompany@alenvi.io' },
    origin: WEBAPP,
  },
  {
    _id: coursesList[3].trainees[0],
    identity: { firstname: 'traineeFromINTERB2B', lastname: 'otherCompany' },
    local: { email: 'traineeFromINTERB2B@alenvi.io' },
    origin: WEBAPP,
  },
  {
    _id: coursesList[3].trainees[1],
    identity: { firstname: 'traineeFromINTERB2B', lastname: 'authCompany' },
    local: { email: 'authTraineeFromINTERB2B@alenvi.io' },
    origin: WEBAPP,
  },
  {
    _id: coursesList[4].trainees[0],
    identity: { firstname: 'interB2Btrainee', lastname: 'withOtherCompany' },
    local: { email: 'otherTraineeFromINTERB2B@alenvi.io' },
    origin: WEBAPP,
  },
  {
    _id: coursesList[6].trainees[0],
    identity: { firstname: 'authCompanyTrainee', lastname: 'unsubscribed' },
    refreshToken: uuidv4(),
    local: { email: 'trainee@compani.fr' },
    origin: WEBAPP,
  },
  {
    _id: coursesList[6].trainees[1],
    identity: { firstname: 'otherCompanyTrainee', lastname: 'unsubscribed' },
    refreshToken: uuidv4(),
    local: { email: 'trainee2@compani.fr' },
    origin: WEBAPP,
  },
];

const userCompanyList = [
  { user: companyTraineesList[0]._id, company: authCompany._id },
  { user: companyTraineesList[2]._id, company: otherCompany._id },
  { user: companyTraineesList[3]._id, company: authCompany._id },
  { user: companyTraineesList[4]._id, company: otherCompany._id },
  { user: companyTraineesList[5]._id, company: authCompany._id },
  { user: companyTraineesList[6]._id, company: otherCompany._id },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    Attendance.create(attendancesList),
    Course.create(coursesList),
    CourseSlot.create(slotsList),
    User.create([...userList, ...companyTraineesList]),
    UserCompany.create(userCompanyList),
    Program.create(program),
    SubProgram.create(subProgram),
  ]);
};

module.exports = {
  populateDB,
  attendancesList,
  coursesList,
  slotsList,
  userList,
  companyTraineesList,
  userCompanyList,
};
