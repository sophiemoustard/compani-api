const { ObjectID } = require('mongodb');
const uuidv4 = require('uuid/v4');
const Course = require('../../../src/models/Course');
const Program = require('../../../src/models/Program');
const CourseSlot = require('../../../src/models/CourseSlot');
const User = require('../../../src/models/User');
const { populateDBForAuthentication, authCompany, otherCompany, rolesList } = require('./authenticationSeed');

const trainer = {
  _id: new ObjectID(),
  identity: { firstname: 'trainer', lastname: 'trainer' },
  status: 'internal',
  refreshToken: uuidv4(),
  local: { email: 'course_slot_trainer@alenvi.io', password: '123456!eR' },
  role: { vendor: rolesList.find(role => role.name === 'trainer')._id },
  company: authCompany._id,
};

const programsList = [
  { _id: new ObjectID(), name: 'program' },
  { _id: new ObjectID(), name: 'training program' },
];

const coursesList = [
  {
    _id: new ObjectID(),
    name: 'first session',
    program: programsList[0]._id,
    companies: [authCompany._id],
    type: 'intra',
    trainer: new ObjectID(),
  },
  {
    _id: new ObjectID(),
    name: 'team formation',
    program: programsList[0]._id,
    companies: [otherCompany._id],
    type: 'intra',
    trainer: trainer._id,
  },
];

const courseSlotsList = [
  {
    _id: new ObjectID(),
    startDate: '2020-03-10T09:00:00',
    endDate: '2020-03-10T12:00:00',
    courseId: coursesList[0]._id,
  },
  {
    _id: new ObjectID(),
    startDate: '2020-04-10T09:00:00',
    endDate: '2020-04-10T12:00:00',
    courseId: coursesList[0]._id,
  },
  {
    _id: new ObjectID(),
    startDate: '2020-03-10T09:00:00',
    endDate: '2020-03-10T12:00:00',
    courseId: coursesList[1]._id,
  },
];

const populateDB = async () => {
  await Course.deleteMany({});
  await CourseSlot.deleteMany({});
  await Program.deleteMany({});
  await User.deleteMany({});

  await populateDBForAuthentication();

  await Program.insertMany(programsList);
  await Course.insertMany(coursesList);
  await CourseSlot.insertMany(courseSlotsList);
  await User.create(trainer);
};

module.exports = {
  populateDB,
  coursesList,
  programsList,
  courseSlotsList,
  trainer,
};
