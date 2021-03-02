const { ObjectID } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const Attendance = require('../../../src/models/Attendance');
const Course = require('../../../src/models/Course');
const CourseSlot = require('../../../src/models/CourseSlot');
const User = require('../../../src/models/User');
const { rolesList } = require('../../seed/roleSeed');
const { TRAINER, WEBAPP } = require('../../../src/helpers/constants');

const { populateDBForAuthentication, authCompany } = require('./authenticationSeed');

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
  },
  {
    _id: new ObjectID(),
    subProgram: new ObjectID(),
    company: authCompany._id,
    type: 'intra',
    trainees: [new ObjectID()],
    trainer: trainerList[0]._id,
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

const companyTraineesList = [
  {
    _id: coursesList[0].trainees[1],
    identity: { firstname: 'trainee', lastname: 'withCompany' },
    local: { email: 'traineeWithCompany@alenvi.io', password: '123456!eR' },
    origin: WEBAPP,
    company: authCompany._id,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'trainee', lastname: 'withoutCompany' },
    local: { email: 'traineeWithoutCompany@alenvi.io', password: '123456!eR' },
    origin: WEBAPP,
  },

];

const populateDB = async () => {
  await Attendance.deleteMany({});
  await Course.deleteMany({});
  await CourseSlot.deleteMany({});
  await User.deleteMany({});

  await populateDBForAuthentication();

  await Attendance.insertMany(attendancesList);
  await Course.insertMany(coursesList);
  await CourseSlot.insertMany(slotsList);
  for (const user of trainerList) {
    await (new User(user)).save();
  }
  for (const user of companyTraineesList) {
    await (new User(user)).save();
  }
};

module.exports = {
  populateDB,
  attendancesList,
  coursesList,
  slotsList,
  trainerList,
  companyTraineesList,
};
