const { ObjectID } = require('mongodb');
const AttendanceSheet = require('../../../src/models/AttendanceSheet');
const Course = require('../../../src/models/Course');
const CourseSlot = require('../../../src/models/CourseSlot');
const { populateDBForAuthentication, authCompany, otherCompany } = require('./authenticationSeed');
const { WEBAPP } = require('../../../src/helpers/constants');
const { vendorAdmin, coach } = require('../../seed/userSeed');
const UserCompany = require('../../../src/models/UserCompany');

const traineeFromOtherCompany = {
  _id: new ObjectID(),
  identity: { firstname: 'traineeFromINTERB2B', lastname: 'withOtherCompany' },
  local: { email: 'traineeFromINTERB2B@alenvi.io', password: '123456!eR' },
  origin: WEBAPP,
};

const userCompany = { _id: new ObjectID(), user: traineeFromOtherCompany._id, company: otherCompany._id };

const coursesList = [
  {
    _id: new ObjectID(),
    subProgram: new ObjectID(),
    company: authCompany._id,
    type: 'intra',
    trainees: [coach._id],
    salesRepresentative: vendorAdmin._id,
  },
  {
    _id: new ObjectID(),
    subProgram: new ObjectID(),
    company: authCompany._id,
    type: 'inter_b2b',
    trainees: [coach._id],
    salesRepresentative: vendorAdmin._id,
  },
  {
    _id: new ObjectID(),
    subProgram: new ObjectID(),
    type: 'intra',
    company: otherCompany._id,
    trainees: [coach._id],
    salesRepresentative: vendorAdmin._id,
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
    trainee: coach._id,
  },
  {
    _id: new ObjectID(),
    course: coursesList[1],
    file: { publicId: 'mon upload', link: 'www.test.com' },
    trainee: coach._id,
  },
  {
    _id: new ObjectID(),
    course: coursesList[1],
    file: { publicId: 'mon upload', link: 'www.test.com' },
    trainee: traineeFromOtherCompany._id,
  },
];

const slotsList = [
  { startDate: '2020-01-23T09:00:00', endDate: '2020-01-23T11:00:00', course: coursesList[0], step: new ObjectID() },
];

const populateDB = async () => {
  await AttendanceSheet.deleteMany();
  await Course.deleteMany();
  await CourseSlot.deleteMany();
  await UserCompany.deleteMany();

  await populateDBForAuthentication();

  await AttendanceSheet.insertMany(attendanceSheetsList);
  await Course.insertMany(coursesList);
  await CourseSlot.insertMany(slotsList);
  await UserCompany.create(userCompany);
};

module.exports = {
  populateDB,
  attendanceSheetsList,
  coursesList,
  slotsList,
};
