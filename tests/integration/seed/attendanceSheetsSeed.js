const { ObjectID } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const AttendanceSheet = require('../../../src/models/AttendanceSheet');
const Course = require('../../../src/models/Course');
const CourseSlot = require('../../../src/models/CourseSlot');
const { authCompany, otherCompany } = require('../../seed/authCompaniesSeed');
const { WEBAPP } = require('../../../src/helpers/constants');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');
const UserCompany = require('../../../src/models/UserCompany');
const User = require('../../../src/models/User');
const { vendorAdminRoleId } = require('../../seed/authRolesSeed');

const userList = [
  {
    _id: new ObjectID(),
    identity: { firstname: 'sales', lastname: 'representative' },
    refreshToken: uuidv4(),
    local: { email: 'salesrep@compani.fr' },
    role: { client: vendorAdminRoleId },
    origin: WEBAPP,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'learner', lastname: 'nocompany' },
    refreshToken: uuidv4(),
    local: { email: 'learner@compani.fr', password: '123456!eR' },
    origin: WEBAPP,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'traineeFromINTERB2B', lastname: 'withOtherCompany' },
    local: { email: 'traineeFromINTERB2B@alenvi.io' },
    origin: WEBAPP,
  },
];

const userCompaniesList = [
  { _id: new ObjectID(), user: userList[0]._id, company: authCompany._id },
  { _id: new ObjectID(), user: userList[1]._id, company: authCompany._id },
  { _id: new ObjectID(), user: userList[2]._id, company: otherCompany._id },
];

const coursesList = [
  {
    _id: new ObjectID(),
    subProgram: new ObjectID(),
    company: authCompany._id,
    type: 'intra',
    trainees: [userList[1]._id],
    salesRepresentative: userList[0]._id,
  },
  {
    _id: new ObjectID(),
    subProgram: new ObjectID(),
    company: authCompany._id,
    type: 'inter_b2b',
    trainees: [userList[1]._id],
    salesRepresentative: userList[0]._id,
  },
  {
    _id: new ObjectID(),
    subProgram: new ObjectID(),
    type: 'intra',
    company: otherCompany._id,
    trainees: [userList[1]._id],
    salesRepresentative: userList[0]._id,
  },
];

const attendanceSheetsList = [
  {
    _id: new ObjectID(),
    course: coursesList[0],
    file: { publicId: 'mon upload', link: 'www.test.com' },
    date: '2020-04-03T10:00:00',
  },
  {
    _id: new ObjectID(),
    course: coursesList[0],
    file: { publicId: 'mon upload', link: 'www.test.com' },
    trainee: userList[1]._id,
  },
  {
    _id: new ObjectID(),
    course: coursesList[1],
    file: { publicId: 'mon upload', link: 'www.test.com' },
    trainee: userList[1]._id,
  },
  {
    _id: new ObjectID(),
    course: coursesList[1],
    file: { publicId: 'mon upload', link: 'www.test.com' },
    trainee: userList[2]._id,
  },
];

const slotsList = [
  { startDate: '2020-01-23T09:00:00', endDate: '2020-01-23T11:00:00', course: coursesList[0], step: new ObjectID() },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    AttendanceSheet.create(attendanceSheetsList),
    Course.create(coursesList),
    CourseSlot.create(slotsList),
    User.create(userList),
    UserCompany.create(userCompaniesList),
  ]);
};

module.exports = {
  populateDB,
  attendanceSheetsList,
  coursesList,
  slotsList,
};
