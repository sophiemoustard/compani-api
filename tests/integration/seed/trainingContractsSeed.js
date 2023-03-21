const { ObjectId } = require('mongodb');
const Course = require('../../../src/models/Course');
const Program = require('../../../src/models/Program');
const SubProgram = require('../../../src/models/SubProgram');
const TrainingContract = require('../../../src/models/TrainingContract');
const { authCompany } = require('../../seed/authCompaniesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');
const { vendorAdmin, helper, clientAdmin, coach, trainer, trainerAndCoach } = require('../../seed/authUsersSeed');
const { INTRA } = require('../../../src/helpers/constants');

const subProgram = { _id: new ObjectId(), name: 'sous-programme 1' };

const program = {
  _id: new ObjectId(),
  name: 'program',
  learningGoals: 'on est là',
  description: 'Ceci est une description',
  subPrograms: [subProgram._id],
};

const courseList = [
  { // 0
    _id: new ObjectId(),
    subProgram: subProgram._id,
    misc: 'first session',
    trainer: trainer._id,
    trainees: [coach._id, helper._id],
    companies: [authCompany._id],
    type: INTRA,
    maxTrainees: 8,
    salesRepresentative: vendorAdmin._id,
    companyRepresentative: trainerAndCoach._id,
    contact: trainerAndCoach._id,
    expectedBillsCount: 2,
  },
  { // 1
    _id: new ObjectId(),
    subProgram: subProgram._id,
    misc: 'second irst session',
    trainer: trainer._id,
    trainees: [clientAdmin._id, vendorAdmin._id],
    companies: [authCompany._id],
    type: INTRA,
    maxTrainees: 8,
    salesRepresentative: vendorAdmin._id,
    companyRepresentative: trainerAndCoach._id,
    contact: trainerAndCoach._id,
    expectedBillsCount: 2,
  },
];

const trainingContract = {
  course: courseList[1]._id,
  company: authCompany._id,
  link: 'https://cloudstorage.com',
};

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    SubProgram.create(subProgram),
    Program.create(program),
    Course.create(courseList),
    TrainingContract.create(trainingContract),
  ]);
};

module.exports = {
  populateDB,
  courseList,
};
