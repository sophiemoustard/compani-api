const { ObjectId } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const Course = require('../../../src/models/Course');
const CourseHistory = require('../../../src/models/CourseHistory');
const User = require('../../../src/models/User');
const { authCompany } = require('../../seed/authCompaniesSeed');
const { SLOT_CREATION, WEBAPP, INTRA, INTER_B2B } = require('../../../src/helpers/constants');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');
const { vendorAdminRoleId, trainerRoleId } = require('../../seed/authRolesSeed');

const userList = [
  {
    _id: new ObjectId(),
    identity: { firstname: 'course', lastname: 'Trainer' },
    refreshToken: uuidv4(),
    local: { email: 'trainerCourseHistories@alenvi.io', password: '123456!eR' },
    role: { vendor: trainerRoleId },
    origin: WEBAPP,
  },
  {
    _id: new ObjectId(),
    identity: { firstname: 'salesrep', lastname: 'noCourse' },
    refreshToken: uuidv4(),
    local: { email: 'salerep@compani.fr' },
    role: { vendor: vendorAdminRoleId },
    origin: WEBAPP,
  },
];

const subProgramsList = [{ _id: new ObjectId(), name: 'sous-programme A', steps: [] }];

const coursesList = [{
  _id: new ObjectId(),
  subProgram: subProgramsList[0]._id,
  company: authCompany._id,
  misc: 'first session',
  type: INTRA,
  maxTrainees: 8,
  trainer: userList[0]._id,
  trainees: [],
  salesRepresentative: userList[1]._id,
},
{
  _id: new ObjectId(),
  subProgram: subProgramsList[0]._id,
  company: new ObjectId(),
  misc: 'first session',
  type: INTRA,
  maxTrainees: 8,
  trainer: new ObjectId(),
  trainees: [],
  salesRepresentative: userList[1]._id,
},
{
  _id: new ObjectId(),
  subProgram: subProgramsList[0]._id,
  misc: 'inter b2b session',
  type: INTER_B2B,
  format: 'blended',
  trainer: userList[0]._id,
  trainees: [],
  salesRepresentative: userList[1]._id,
}];

const courseHistoriesList = [{
  createdBy: new ObjectId(),
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
  createdBy: new ObjectId(),
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
  createdBy: new ObjectId(),
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
  createdBy: new ObjectId(),
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
