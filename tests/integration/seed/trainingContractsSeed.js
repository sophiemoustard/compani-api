const { ObjectId } = require('mongodb');
const Course = require('../../../src/models/Course');
const Program = require('../../../src/models/Program');
const SubProgram = require('../../../src/models/SubProgram');
const TrainingContract = require('../../../src/models/TrainingContract');
const { authCompany, otherCompany, companyWithoutSubscription } = require('../../seed/authCompaniesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/db');
const { vendorAdmin, helper, clientAdmin, coach, trainer, trainerAndCoach } = require('../../seed/authUsersSeed');
const { INTRA, INTER_B2B } = require('../../../src/helpers/constants');

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
    misc: 'second session',
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
  { // 2
    _id: new ObjectId(),
    subProgram: subProgram._id,
    misc: 'third session',
    trainer: trainer._id,
    trainees: [],
    companies: [companyWithoutSubscription._id],
    type: INTRA,
    maxTrainees: 8,
    salesRepresentative: vendorAdmin._id,
    expectedBillsCount: 2,
  },
  { // 3 archived course
    _id: new ObjectId(),
    subProgram: subProgram._id,
    misc: 'fourth session',
    trainer: trainer._id,
    trainees: [coach._id],
    companies: [authCompany._id, otherCompany._id],
    type: INTER_B2B,
    salesRepresentative: vendorAdmin._id,
    expectedBillsCount: 2,
    archivedAt: '2023-01-03T14:00:00.000Z',
  },
];

const trainingContractList = [
  {
    _id: new ObjectId(),
    course: courseList[1]._id,
    company: authCompany._id,
    file: { publicId: '123test', link: 'ceciestunlien' },
  },
  {
    _id: new ObjectId(),
    course: courseList[3]._id,
    company: authCompany._id,
    file: { publicId: '124test', link: 'celaestunlien' },
  },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    SubProgram.create(subProgram),
    Program.create(program),
    Course.create(courseList),
    TrainingContract.create(trainingContractList),
  ]);
};

module.exports = {
  populateDB,
  courseList,
  trainingContractList,
};
