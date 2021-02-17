const { ObjectID } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const Course = require('../../../src/models/Course');
const Program = require('../../../src/models/Program');
const CourseSlot = require('../../../src/models/CourseSlot');
const User = require('../../../src/models/User');
const Step = require('../../../src/models/Step');
const SubProgram = require('../../../src/models/SubProgram');
const Attendance = require('../../../src/models/Attendance');
const { populateDBForAuthentication, authCompany, otherCompany, rolesList } = require('./authenticationSeed');
const { WEBAPP } = require('../../../src/helpers/constants');

const trainer = {
  _id: new ObjectID(),
  identity: { firstname: 'trainer', lastname: 'trainer' },
  refreshToken: uuidv4(),
  local: { email: 'course_slot_trainer@alenvi.io', password: '123456!eR' },
  role: { vendor: rolesList.find(role => role.name === 'trainer')._id },
  company: authCompany._id,
  origin: WEBAPP,
};

const stepsList = [
  { _id: new ObjectID(), type: 'on_site', name: 'c\'est une étape' },
  { _id: new ObjectID(), type: 'e_learning', name: 'toujours une étape' },
  { _id: new ObjectID(), type: 'e_learning', name: 'encore une étape' },
  { _id: new ObjectID(), type: 'on_site', name: 'encore une étape' },
];

const subProgramsList = [
  { _id: new ObjectID(), name: 'sous-programme A', steps: [stepsList[0]._id, stepsList[1]._id] },
  { _id: new ObjectID(), name: 'sous-programme B', steps: [stepsList[2]._id, stepsList[3]._id] },
];

const programsList = [
  { _id: new ObjectID(), name: 'program', subPrograms: [subProgramsList[0]] },
  { _id: new ObjectID(), name: 'training program', subPrograms: [subProgramsList[1]] },
];

const coursesList = [
  {
    _id: new ObjectID(),
    subProgram: subProgramsList[0]._id,
    company: authCompany._id,
    misc: 'first session',
    type: 'intra',
    trainer: new ObjectID(),
  },
  {
    _id: new ObjectID(),
    subProgram: subProgramsList[0]._id,
    company: otherCompany._id,
    misc: 'team formation',
    type: 'intra',
    trainer: trainer._id,
  },
];

const courseSlotsList = [
  {
    _id: new ObjectID(),
    startDate: '2020-03-10T09:00:00',
    endDate: '2020-03-10T12:00:00',
    course: coursesList[0]._id,
    step: stepsList[0]._id,
  },
  {
    _id: new ObjectID(),
    startDate: '2020-04-10T09:00:00',
    endDate: '2020-04-10T12:00:00',
    course: coursesList[0]._id,
    step: stepsList[0]._id,
  },
  {
    _id: new ObjectID(),
    startDate: '2020-03-10T09:00:00',
    endDate: '2020-03-10T12:00:00',
    course: coursesList[1]._id,
    step: stepsList[0]._id,
  },
  {
    _id: new ObjectID(),
    startDate: '2020-04-10T09:00:00',
    endDate: '2020-04-10T12:00:00',
    course: coursesList[1]._id,
    step: stepsList[0]._id,
  },
  { // slot with attendance
    _id: new ObjectID(),
    startDate: '2020-05-10T09:00:00',
    endDate: '2020-05-10T12:00:00',
    course: coursesList[1]._id,
    step: stepsList[0]._id,
  },
];

const attendance = {
  _id: new ObjectID(),
  trainee: new ObjectID(),
  courseSlot: courseSlotsList[4]._id,
};

const populateDB = async () => {
  await Course.deleteMany({});
  await SubProgram.deleteMany({});
  await CourseSlot.deleteMany({});
  await Program.deleteMany({});
  await User.deleteMany({});
  await Step.deleteMany({});
  await Attendance.deleteMany({});

  await populateDBForAuthentication();

  await SubProgram.insertMany(subProgramsList);
  await Program.insertMany(programsList);
  await Course.insertMany(coursesList);
  await CourseSlot.insertMany(courseSlotsList);
  await Step.insertMany(stepsList);
  await User.create(trainer);
  await Attendance.create(attendance);
};

module.exports = {
  populateDB,
  coursesList,
  programsList,
  courseSlotsList,
  trainer,
  stepsList,
};
