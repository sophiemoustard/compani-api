const { ObjectID } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const Course = require('../../../src/models/Course');
const CourseHistory = require('../../../src/models/CourseHistory');
const User = require('../../../src/models/User');
const { authCompany } = require('../../seed/authCompaniesSeed');
const { SLOT_CREATION, WEBAPP } = require('../../../src/helpers/constants');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');
const { vendorAdminRoleId, trainerRoleId } = require('../../seed/authRolesSeed');

const userList = [
  {
    _id: new ObjectID(),
    identity: { firstname: 'course', lastname: 'Trainer' },
    refreshToken: uuidv4(),
    local: { email: 'trainerCourseHistories@alenvi.io', password: '123456!eR' },
    role: { vendor: trainerRoleId },
    origin: WEBAPP,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'salesrep', lastname: 'noCourse' },
    refreshToken: uuidv4(),
    local: { email: 'salerep@compani.fr' },
    role: { vendor: vendorAdminRoleId },
    origin: WEBAPP,
  },
];

const subProgramsList = [{ _id: new ObjectID(), name: 'sous-programme A', steps: [] }];

const coursesList = [{
  _id: new ObjectID(),
  subProgram: subProgramsList[0]._id,
  company: authCompany._id,
  misc: 'first session',
  type: 'intra',
  trainer: userList[0]._id,
  trainees: [],
  salesRepresentative: userList[1]._id,
},
{
  _id: new ObjectID(),
  subProgram: subProgramsList[0]._id,
  company: new ObjectID(),
  misc: 'first session',
  type: 'intra',
  trainer: new ObjectID(),
  trainees: [],
  salesRepresentative: userList[1]._id,
},
{
  _id: new ObjectID(),
  subProgram: subProgramsList[0]._id,
  misc: 'inter b2b session',
  type: 'inter_b2b',
  format: 'blended',
  trainer: userList[0]._id,
  trainees: [],
  salesRepresentative: userList[1]._id,
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
  await deleteNonAuthenticationSeeds();

  await Promise.all([Course.create(coursesList), CourseHistory.create(courseHistoriesList), User.create(userList)]);
};

module.exports = {
  populateDB,
  coursesList,
  courseHistoriesList,
  userList,
};
