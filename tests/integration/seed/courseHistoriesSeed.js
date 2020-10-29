const { ObjectID } = require('mongodb');
const Course = require('../../../src/models/Course');
const CourseHistory = require('../../../src/models/CourseHistory');
const { populateDBForAuthentication } = require('./authenticationSeed');
const { SLOT_CREATION } = require('../../../src/helpers/constants');

const subProgramsList = [
  { _id: new ObjectID(), name: 'sous-programme A', steps: [] },
];

const coursesList = [{
  _id: new ObjectID(),
  subProgram: subProgramsList[0]._id,
  company: new ObjectID(),
  misc: 'first session',
  type: 'inter_b2b',
  trainer: new ObjectID(),
  trainees: [],
},
{
  _id: new ObjectID(),
  subProgram: subProgramsList[0]._id,
  company: new ObjectID(),
  misc: 'first session',
  type: 'inter_b2b',
  trainer: new ObjectID(),
  trainees: [],
}];

const courseHistoriesList = [{
  createdBy: new ObjectID(),
  action: SLOT_CREATION,
  course: coursesList[0]._id,
  slot: {
    startDate: '2020-06-25T05:00:00',
    endDate: '2020-06-25T07:00:00',
    address: {
      fullAddress: '4 rue du test 92240 Malakoff',
      street: '4 rue du test',
      zipCode: '92240',
      city: 'Malakoff',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
},
{
  createdBy: new ObjectID(),
  action: SLOT_CREATION,
  course: coursesList[1]._id,
  slot: {
    startDate: '2020-06-26T05:00:00',
    endDate: '2020-06-26T07:00:00',
    address: {
      fullAddress: '4 rue du test 92240 Malakoff',
      street: '4 rue du test',
      zipCode: '92240',
      city: 'Malakoff',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
}];

const populateDB = async () => {
  await Course.deleteMany({});
  await CourseHistory.deleteMany({});

  await populateDBForAuthentication();

  await Course.insertMany(coursesList);
  await CourseHistory.insertMany(courseHistoriesList);
};

module.exports = {
  populateDB,
  coursesList,
  courseHistoriesList,
};
