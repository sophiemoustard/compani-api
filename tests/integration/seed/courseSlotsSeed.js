const { ObjectId } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const Course = require('../../../src/models/Course');
const Program = require('../../../src/models/Program');
const CourseSlot = require('../../../src/models/CourseSlot');
const UserCompany = require('../../../src/models/UserCompany');
const User = require('../../../src/models/User');
const Step = require('../../../src/models/Step');
const SubProgram = require('../../../src/models/SubProgram');
const Attendance = require('../../../src/models/Attendance');
const { authCompany, otherCompany } = require('../../seed/authCompaniesSeed');
const { vendorAdmin } = require('../../seed/authUsersSeed');
const { WEBAPP, INTRA } = require('../../../src/helpers/constants');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');
const { trainerRoleId } = require('../../seed/authRolesSeed');

const trainer = {
  _id: new ObjectId(),
  identity: { firstname: 'trainer', lastname: 'trainer' },
  refreshToken: uuidv4(),
  local: { email: 'course_slot_trainer@alenvi.io', password: '123456!eR' },
  role: { vendor: trainerRoleId },
  origin: WEBAPP,
};

const userCompanies = [{ _id: new ObjectId(), user: trainer._id, company: authCompany._id }];

const stepsList = [
  { _id: new ObjectId(), type: 'on_site', name: 'c\'est une étape' },
  { _id: new ObjectId(), type: 'e_learning', name: 'toujours une étape' },
  { _id: new ObjectId(), type: 'e_learning', name: 'encore une étape' },
  { _id: new ObjectId(), type: 'on_site', name: 'encore une étape' },
  { _id: new ObjectId(), type: 'remote', name: 'une étape de plus' },
];

const subProgramsList = [
  { _id: new ObjectId(), name: 'sous-programme A', steps: [stepsList[0]._id, stepsList[1]._id, stepsList[4]._id] },
  { _id: new ObjectId(), name: 'sous-programme B', steps: [stepsList[2]._id, stepsList[3]._id] },
];

const programsList = [
  { _id: new ObjectId(), name: 'program', subPrograms: [subProgramsList[0]] },
  { _id: new ObjectId(), name: 'training program', subPrograms: [subProgramsList[1]] },
];

const coursesList = [
  {
    _id: new ObjectId(),
    subProgram: subProgramsList[0]._id,
    trainees: [],
    companies: [authCompany._id],
    misc: 'first session',
    type: INTRA,
    maxTrainees: 8,
    trainer: new ObjectId(),
    salesRepresentative: vendorAdmin._id,
  },
  {
    _id: new ObjectId(),
    subProgram: subProgramsList[0]._id,
    trainees: [],
    companies: [otherCompany._id],
    misc: 'team formation',
    type: INTRA,
    maxTrainees: 8,
    trainer: trainer._id,
    salesRepresentative: vendorAdmin._id,
  },
  {
    _id: new ObjectId(),
    subProgram: subProgramsList[0]._id,
    trainees: [],
    companies: [authCompany._id],
    misc: 'old session',
    type: INTRA,
    maxTrainees: 8,
    trainer: trainer._id,
    salesRepresentative: vendorAdmin._id,
    archivedAt: '2021-11-15T09:00:00',
  },
];

const courseSlotsList = [
  {
    _id: new ObjectId(),
    startDate: '2020-03-10T09:00:00',
    endDate: '2020-03-10T12:00:00',
    course: coursesList[0]._id,
    step: stepsList[0]._id,
    address: {
      street: '37 rue de Ponthieu',
      zipCode: '75008',
      city: 'Paris',
      fullAddress: '37 rue de Ponthieu 75008 Paris',
      location: { type: 'Point', coordinates: [2.0987, 1.2345] },
    },
  },
  {
    _id: new ObjectId(),
    startDate: '2020-04-10T09:00:00',
    endDate: '2020-04-10T12:00:00',
    course: coursesList[0]._id,
    step: stepsList[0]._id,
  },
  {
    _id: new ObjectId(),
    startDate: '2020-03-10T09:00:00',
    endDate: '2020-03-10T12:00:00',
    course: coursesList[1]._id,
    step: stepsList[0]._id,
  },
  {
    _id: new ObjectId(),
    startDate: '2020-04-10T09:00:00',
    endDate: '2020-04-10T12:00:00',
    course: coursesList[1]._id,
    step: stepsList[0]._id,
  },
  { // slot with attendance
    _id: new ObjectId(),
    startDate: '2020-05-10T09:00:00',
    endDate: '2020-05-10T12:00:00',
    course: coursesList[1]._id,
    step: stepsList[0]._id,
  },
  { // old session slot
    _id: new ObjectId(),
    startDate: '2020-05-10T09:00:00',
    endDate: '2020-05-10T12:00:00',
    course: coursesList[2]._id,
    step: stepsList[0]._id,
  },
  { // slot to plan
    _id: new ObjectId(),
    course: coursesList[1]._id,
    step: stepsList[0]._id,
  },
  {
    _id: new ObjectId(),
    startDate: '2020-05-10T09:00:00',
    endDate: '2020-05-10T12:00:00',
    course: coursesList[0]._id,
    step: stepsList[1]._id,
  },
  { // remote slot with meetingLink
    _id: new ObjectId(),
    startDate: '2020-12-10T09:00:00',
    endDate: '2020-12-10T12:00:00',
    course: coursesList[0]._id,
    step: stepsList[4]._id,
    meetingLink: 'https://meet.google.com',
  },
];

const attendance = {
  _id: new ObjectId(),
  trainee: new ObjectId(),
  courseSlot: courseSlotsList[4]._id,
  company: otherCompany._id,
};

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    SubProgram.create(subProgramsList),
    Program.create(programsList),
    Course.create(coursesList),
    CourseSlot.create(courseSlotsList),
    Step.create(stepsList),
    User.create(trainer),
    Attendance.create(attendance),
    UserCompany.create(userCompanies),
  ]);
};

module.exports = {
  populateDB,
  coursesList,
  programsList,
  courseSlotsList,
  trainer,
  stepsList,
};
