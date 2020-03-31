const uuidv4 = require('uuid/v4');
const { ObjectID } = require('mongodb');
const Course = require('../../../src/models/Course');
const Program = require('../../../src/models/Program');
const User = require('../../../src/models/User');
const { populateDBForAuthentication, authCompany, otherCompany, rolesList } = require('./authenticationSeed');

const auxiliary = {
  _id: new ObjectID(),
  identity: { firstname: 'test', lastname: 'toto' },
  local: { email: 'othercompanyauxiliary@alenvi.io', password: '123456!eR' },
  role: { client: rolesList.find(role => role.name === 'auxiliary')._id },
  contact: { phone: '0632896751' },
  refreshToken: uuidv4(),
  company: authCompany._id,
  inactivityDate: null,
};

const trainee = {
  _id: new ObjectID(),
  identity: { firstname: 'Tata', lastname: 'Tutu' },
  local: { email: 'trainee@alenvi.io', password: '123456!eR' },
  role: { client: rolesList.find(role => role.name === 'auxiliary')._id },
  contact: { phone: '0734856751' },
  refreshToken: uuidv4(),
  company: authCompany._id,
  inactivityDate: null,
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
  },
  {
    _id: new ObjectID(),
    name: 'team formation',
    program: programsList[0]._id,
    companies: [otherCompany._id],
    type: 'intra',
  },
  {
    _id: new ObjectID(),
    name: 'second session',
    program: programsList[0]._id,
    companies: [authCompany._id],
    type: 'intra',
    trainees: [trainee._id],
  },
];

const populateDB = async () => {
  await Course.deleteMany({});
  await Program.deleteMany({});
  await User.deleteMany({});

  await populateDBForAuthentication();

  await Program.insertMany(programsList);
  await Course.insertMany(coursesList);
  await User.create([auxiliary, trainee]);
};

module.exports = {
  populateDB,
  coursesList,
  programsList,
  auxiliary,
  trainee,
};
