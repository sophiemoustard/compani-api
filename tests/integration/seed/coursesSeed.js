const { ObjectID } = require('mongodb');
const Course = require('../../../src/models/Course');
const Program = require('../../../src/models/Program');
const { populateDBForAuthentication, authCompany, otherCompany } = require('./authenticationSeed');

const programsList = [
  { _id: new ObjectID(), name: 'program' },
  { _id: new ObjectID(), name: 'training program' },
];

const coursesList = [
  { _id: new ObjectID(), name: 'first session', program: programsList[0]._id, company: authCompany._id, type: 'intra' },
  {
    _id: new ObjectID(),
    name: 'team formation',
    program: programsList[0]._id,
    company: otherCompany._id,
    type: 'intra',
  },
];

const populateDB = async () => {
  await Course.deleteMany({});
  await Program.deleteMany({});

  await populateDBForAuthentication();

  await Program.insertMany(programsList);
  await Course.insertMany(coursesList);
};

module.exports = {
  populateDB,
  coursesList,
  programsList,
};
