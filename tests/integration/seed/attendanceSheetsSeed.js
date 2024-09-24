const { ObjectId } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const AttendanceSheet = require('../../../src/models/AttendanceSheet');
const Course = require('../../../src/models/Course');
const CourseHistory = require('../../../src/models/CourseHistory');
const CourseSlot = require('../../../src/models/CourseSlot');
const Step = require('../../../src/models/Step');
const SubProgram = require('../../../src/models/SubProgram');
const { authCompany, otherCompany, companyWithoutSubscription, otherHolding } = require('../../seed/authCompaniesSeed');
const {
  WEBAPP,
  INTRA,
  INTER_B2B,
  TRAINEE_ADDITION,
  MOBILE,
  PUBLISHED,
  INTRA_HOLDING,
} = require('../../../src/helpers/constants');
const { deleteNonAuthenticationSeeds } = require('../helpers/db');
const UserCompany = require('../../../src/models/UserCompany');
const User = require('../../../src/models/User');
const { vendorAdminRoleId, trainerRoleId } = require('../../seed/authRolesSeed');
const { trainerOrganisationManager, trainer } = require('../../seed/authUsersSeed');

const userList = [
  {
    _id: new ObjectId(),
    identity: { firstname: 'operations', lastname: 'representative' },
    refreshToken: uuidv4(),
    local: { email: 'operationsrep@compani.fr' },
    role: { vendor: vendorAdminRoleId },
    origin: WEBAPP,
  },
  {
    _id: new ObjectId(),
    identity: { firstname: 'learner', lastname: 'from AuthCompany' },
    refreshToken: uuidv4(),
    local: { email: 'learner@compani.fr', password: '123456!eR' },
    origin: WEBAPP,
  },
  {
    _id: new ObjectId(),
    identity: { firstname: 'traineeFromINTERB2B', lastname: 'withOtherCompany' },
    local: { email: 'traineeFromINTERB2B@alenvi.io' },
    origin: WEBAPP,
  },
  {
    _id: new ObjectId(),
    identity: { firstname: 'trainer', lastname: 'FromOtherCompany' },
    local: { email: 'trainerFromOtherCompany@compani.fr' },
    role: { vendor: trainerRoleId },
    origin: WEBAPP,
  },
  {
    _id: new ObjectId(),
    identity: { firstname: 'thirdCompany', lastname: 'User' },
    local: { email: 'trainerFromThirdCompany@compani.fr' },
    origin: WEBAPP,
  },
];

const userCompaniesList = [
  // old inactive user company
  {
    _id: new ObjectId(),
    user: userList[0]._id,
    company: companyWithoutSubscription._id,
    startDate: '2022-01-01T23:00:00.000Z',
    endDate: '2022-11-30T23:00:00.000Z',
  },
  { _id: new ObjectId(), user: userList[0]._id, company: authCompany._id },
  { _id: new ObjectId(), user: userList[1]._id, company: authCompany._id },
  { _id: new ObjectId(), user: userList[2]._id, company: otherCompany._id },
  { _id: new ObjectId(), user: userList[3]._id, company: otherCompany._id },
  { _id: new ObjectId(), user: userList[4]._id, company: companyWithoutSubscription._id },
];

const steps = [{ _id: new ObjectId(), type: 'on_site', name: 'étape', status: PUBLISHED, theoreticalDuration: 60 }];

const subProgram = { _id: new ObjectId(), name: 'Subprogram 1', steps: [steps[0]._id], status: PUBLISHED };

const coursesList = [
  { // 0
    _id: new ObjectId(),
    subProgram: subProgram._id,
    type: INTRA,
    maxTrainees: 8,
    trainees: [userList[1]._id],
    companies: [authCompany._id],
    operationsRepresentative: userList[0]._id,
    trainers: [trainer._id],
  },
  { // 1
    _id: new ObjectId(),
    subProgram: subProgram._id,
    type: INTER_B2B,
    trainees: [userList[1]._id, userList[2]._id, userList[4]._id],
    companies: [authCompany._id, otherCompany._id, companyWithoutSubscription._id],
    operationsRepresentative: userList[0]._id,
    trainers: [trainer._id],
  },
  { // 2
    _id: new ObjectId(),
    subProgram: subProgram._id,
    type: INTRA,
    maxTrainees: 8,
    trainees: [userList[1]._id],
    companies: [authCompany._id],
    trainers: [userList[3]._id],
    operationsRepresentative: userList[0]._id,
  },
  { // 3 - archived
    _id: new ObjectId(),
    subProgram: subProgram._id,
    type: INTER_B2B,
    archivedAt: new Date(),
    trainees: [userList[1]._id],
    companies: [authCompany._id],
    operationsRepresentative: userList[0]._id,
    trainers: [trainer._id],
  },
  { // 4
    _id: new ObjectId(),
    subProgram: subProgram._id,
    type: INTRA,
    maxTrainees: 8,
    trainees: [userList[2]._id],
    companies: [otherCompany._id],
    trainers: [userList[3]._id],
    operationsRepresentative: userList[0]._id,
  },
  { // 5
    _id: new ObjectId(),
    subProgram: subProgram._id,
    type: INTRA_HOLDING,
    maxTrainees: 8,
    trainees: [userList[2]._id],
    companies: [otherCompany._id],
    holding: otherHolding._id,
    trainers: [trainer._id],
    operationsRepresentative: userList[0]._id,
  },
  { // 6
    _id: new ObjectId(),
    subProgram: subProgram._id,
    type: INTRA_HOLDING,
    maxTrainees: 8,
    trainees: [],
    companies: [],
    holding: otherHolding._id,
    operationsRepresentative: userList[0]._id,
  },
];

const courseHistoriesList = [
  {
    action: TRAINEE_ADDITION,
    course: coursesList[0]._id,
    trainee: userList[1]._id,
    company: authCompany._id,
    createdBy: trainerOrganisationManager._id,
  },
  {
    action: TRAINEE_ADDITION,
    course: coursesList[1]._id,
    trainee: userList[1]._id,
    company: authCompany._id,
    createdBy: trainerOrganisationManager._id,
  },
  {
    action: TRAINEE_ADDITION,
    course: coursesList[1]._id,
    trainee: userList[2]._id,
    company: otherCompany._id,
    createdBy: trainerOrganisationManager._id,
  },
  {
    action: TRAINEE_ADDITION,
    course: coursesList[3]._id,
    trainee: userList[1]._id,
    company: authCompany._id,
    createdBy: trainerOrganisationManager._id,
  },
  {
    action: TRAINEE_ADDITION,
    course: coursesList[4]._id,
    trainee: userList[2]._id,
    company: otherCompany._id,
    createdBy: trainerOrganisationManager._id,
  },
];

const attendanceSheetList = [
  {
    _id: new ObjectId(),
    course: coursesList[0],
    file: { publicId: 'mon upload', link: 'www.test.com' },
    date: '2020-01-23T09:00:00.000Z',
    companies: [authCompany._id],
    origin: WEBAPP,
  },
  {
    _id: new ObjectId(),
    course: coursesList[1],
    file: { publicId: 'mon upload', link: 'www.test.com' },
    trainee: userList[1]._id,
    companies: [authCompany._id],
    origin: WEBAPP,
  },
  {
    _id: new ObjectId(),
    course: coursesList[3],
    file: { publicId: 'mon upload', link: 'www.test.com' },
    trainee: userList[1]._id,
    companies: [authCompany._id],
    origin: MOBILE,
  },
  {
    _id: new ObjectId(),
    course: coursesList[2],
    file: { publicId: 'fromOtherCompany', link: 'www.test.com' },
    date: '2020-01-25T09:00:00.000Z',
    companies: [authCompany._id],
    origin: MOBILE,
  },
  {
    _id: new ObjectId(),
    course: coursesList[1],
    file: { publicId: 'fromThirdCompany', link: 'www.test.com' },
    trainee: userList[4]._id,
    companies: [companyWithoutSubscription._id],
    origin: MOBILE,
  },
];

const slotsList = [
  {
    startDate: '2020-01-23T09:00:00.000Z',
    endDate: '2020-01-23T11:00:00.000Z',
    course: coursesList[0]._id,
    step: steps[0]._id,
  },
  {
    startDate: '2020-01-25T09:00:00.000Z',
    endDate: '2020-01-25T11:00:00.000Z',
    course: coursesList[2]._id,
    step: steps[0]._id,
  },
  {
    startDate: '2020-01-25T09:00:00.000Z',
    endDate: '2020-01-25T11:00:00.000Z',
    course: coursesList[5]._id,
    step: steps[0]._id,
  },
  {
    startDate: '2020-01-25T09:00:00.000Z',
    endDate: '2020-01-25T11:00:00.000Z',
    course: coursesList[6]._id,
    step: steps[0]._id,
  },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    AttendanceSheet.create(attendanceSheetList),
    Course.create(coursesList),
    CourseSlot.create(slotsList),
    User.create(userList),
    UserCompany.create(userCompaniesList),
    CourseHistory.create(courseHistoriesList),
    Step.create(steps),
    SubProgram.create(subProgram),
  ]);
};

module.exports = {
  populateDB,
  attendanceSheetList,
  coursesList,
  slotsList,
};
