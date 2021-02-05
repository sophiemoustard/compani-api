const { ObjectID } = require('mongodb');
const Attendance = require('../../../src/models/Attendance');
const Course = require('../../../src/models/Course');
const CourseSlot = require('../../../src/models/CourseSlot');
const { populateDBForAuthentication, authCompany, trainer } = require('./authenticationSeed');

const coursesList = [
  {
    _id: new ObjectID(),
    subProgram: new ObjectID(),
    company: authCompany._id,
    type: 'intra',
    trainees: [new ObjectID(), new ObjectID()],
    trainer,
  },
  {
    _id: new ObjectID(),
    subProgram: new ObjectID(),
    company: authCompany._id,
    type: 'intra',
    trainees: [new ObjectID()],
    trainer: new ObjectID(),
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
];

const attendancesList = [
  {
    _id: new ObjectID(),
    courseSlot: slotsList[0],
    trainee: coursesList[0].trainees[0],
  },
];

const populateDB = async () => {
  await Attendance.deleteMany({});
  await Course.deleteMany({});
  await CourseSlot.deleteMany({});

  await populateDBForAuthentication();

  await Attendance.insertMany(attendancesList);
  await Course.insertMany(coursesList);
  await CourseSlot.insertMany(slotsList);
};

module.exports = {
  populateDB,
  attendancesList,
  coursesList,
  slotsList,
};
