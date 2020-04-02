const { ObjectID } = require('mongodb');
const Course = require('../../../src/models/Course');
const Program = require('../../../src/models/Program');
const CourseSlot = require('../../../src/models/CourseSlot');
const { populateDBForAuthentication, authCompany, otherCompany } = require('./authenticationSeed');

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
  },
  {
    _id: new ObjectID(),
    name: 'team formation',
    program: programsList[0]._id,
    companies: [otherCompany._id],
    type: 'intra',
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

  await populateDBForAuthentication();

  await Program.insertMany(programsList);
  await Course.insertMany(coursesList);
  await CourseSlot.insertMany(courseSlotsList);
};

module.exports = {
  populateDB,
  coursesList,
  programsList,
  courseSlotsList,
};
