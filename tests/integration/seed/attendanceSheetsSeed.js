const { ObjectID } = require('mongodb');
const AttendanceSheet = require('../../../src/models/AttendanceSheet');
const Course = require('../../../src/models/Course');
const CourseSlot = require('../../../src/models/CourseSlot');
const { populateDBForAuthentication, authCompany, rolesList, userList, otherCompany } = require('./authenticationSeed');
const { COACH, WEBAPP } = require('../../../src/helpers/constants.js');

const coachFromAuthCompany = userList
  .find(user => user.role.client === rolesList.find(role => role.name === COACH)._id);

const traineeFromOtherCompany = {
  _id: new ObjectID(),
  identity: { firstname: 'traineeFromINTERB2B', lastname: 'withOtherCompany' },
  local: { email: 'traineeFromINTERB2B@alenvi.io', password: '123456!eR' },
  origin: WEBAPP,
  company: otherCompany._id,
};

const coursesList = [
  {
    _id: new ObjectID(),
    subProgram: new ObjectID(),
    company: authCompany._id,
    type: 'intra',
    trainees: [coachFromAuthCompany._id],
  },
  {
    _id: new ObjectID(),
    subProgram: new ObjectID(),
    type: 'inter_b2b',
    trainees: [coachFromAuthCompany._id],
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
    trainee: coachFromAuthCompany._id,
  },
  {
    _id: new ObjectID(),
    course: coursesList[1],
    file: { publicId: 'mon upload', link: 'www.test.com' },
    trainee: coachFromAuthCompany._id,
  },
  {
    _id: new ObjectID(),
    course: coursesList[1],
    file: { publicId: 'mon upload', link: 'www.test.com' },
    trainee: traineeFromOtherCompany._id,
  },
];

const slotsList = [
  {
    startDate: new Date('2020-01-23').toISOString(),
    endDate: new Date('2020-01-23').toISOString(),
    course: coursesList[0],
    step: new ObjectID(),
  },
];

const populateDB = async () => {
  await AttendanceSheet.deleteMany({});
  await Course.deleteMany({});
  await CourseSlot.deleteMany({});

  await populateDBForAuthentication();

  await AttendanceSheet.insertMany(attendanceSheetsList);
  await Course.insertMany(coursesList);
  await CourseSlot.insertMany(slotsList);
};

module.exports = {
  populateDB,
  attendanceSheetsList,
  coursesList,
  slotsList,
};
