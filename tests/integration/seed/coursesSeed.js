const { ObjectID } = require('mongodb');
const Course = require('../../../src/models/Course');
const { populateDBForAuthentication } = require('./authenticationSeed');

const coursesList = [
  { _id: new ObjectID(), name: 'course' },
  { _id: new ObjectID(), name: 'training course' },
];

const populateDB = async () => {
  await Course.deleteMany({});

  await populateDBForAuthentication();

  await Course.insertMany(coursesList);
};

module.exports = {
  populateDB,
  coursesList,
};
