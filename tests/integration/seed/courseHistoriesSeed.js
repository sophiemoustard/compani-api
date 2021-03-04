const { ObjectID } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const Course = require('../../../src/models/Course');
const CourseHistory = require('../../../src/models/CourseHistory');
const User = require('../../../src/models/User');
const { populateDBForAuthentication, rolesList, userList } = require('./authenticationSeed');
const { authCompany } = require('../../seed/companySeed');
const { SLOT_CREATION, WEBAPP, CLIENT_ADMIN, TRAINER } = require('../../../src/helpers/constants');

const subProgramsList = [
  { _id: new ObjectID(), name: 'sous-programme A', steps: [] },
];

const courseTrainer = userList.find(user => user.role.vendor === rolesList.find(role => role.name === 'trainer')._id);

const trainerAndClientAdmin = {
  _id: new ObjectID(),
  identity: { firstname: 'Simon', lastname: 'TrainerAndClientAdmin' },
  refreshToken: uuidv4(),
  local: { email: 'simonDu77@alenvi.io', password: '123456!eR' },
  role: {
    client: rolesList.find(role => role.name === CLIENT_ADMIN)._id,
    vendor: rolesList.find(role => role.name === TRAINER)._id,
  },
  company: authCompany._id,
  origin: WEBAPP,
};

const coursesList = [{
  _id: new ObjectID(),
  subProgram: subProgramsList[0]._id,
  company: authCompany._id,
  misc: 'first session',
  type: 'intra',
  trainer: courseTrainer._id,
  trainees: [],
},
{
  _id: new ObjectID(),
  subProgram: subProgramsList[0]._id,
  company: new ObjectID(),
  misc: 'first session',
  type: 'intra',
  trainer: new ObjectID(),
  trainees: [],
},
{
  _id: new ObjectID(),
  subProgram: subProgramsList[0]._id,
  misc: 'inter b2b session',
  type: 'inter_b2b',
  format: 'blended',
  trainer: courseTrainer._id,
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
},
{
  createdBy: new ObjectID(),
  action: SLOT_CREATION,
  course: coursesList[2]._id,
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
  createdAt: '2020-06-26T05:00:00',
},
{
  createdBy: new ObjectID(),
  action: SLOT_CREATION,
  course: coursesList[2]._id,
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
  createdAt: '2020-06-25T05:00:00',
}];

const populateDB = async () => {
  await Course.deleteMany({});
  await CourseHistory.deleteMany({});
  await User.deleteMany({});

  await populateDBForAuthentication();

  await Course.insertMany(coursesList);
  await CourseHistory.insertMany(courseHistoriesList);
  await User.create(trainerAndClientAdmin);
};

module.exports = {
  populateDB,
  coursesList,
  courseHistoriesList,
  courseTrainer,
  trainerAndClientAdmin,
};
