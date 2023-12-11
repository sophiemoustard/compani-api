const { ObjectId } = require('mongodb');
const Course = require('../../../src/models/Course');
const Program = require('../../../src/models/Program');
const Step = require('../../../src/models/Step');
const SubProgram = require('../../../src/models/SubProgram');
const TrainerMission = require('../../../src/models/TrainerMission');
const { authCompany, otherCompany, companyWithoutSubscription } = require('../../seed/authCompaniesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/db');
const { vendorAdmin, trainer, trainerAndCoach } = require('../../seed/authUsersSeed');
const { INTRA, INTER_B2B, PUBLISHED } = require('../../../src/helpers/constants');

const steps = [{ _id: new ObjectId(), type: 'on_site', name: 'étape', status: PUBLISHED, theoreticalDuration: 60 }];

const subProgram = { _id: new ObjectId(), name: 'sous-programme 1', status: PUBLISHED, steps: [steps[0]._id] };

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
    trainees: [],
    companies: [authCompany._id],
    type: INTRA,
    maxTrainees: 8,
    salesRepresentative: vendorAdmin._id,
    expectedBillsCount: 2,
  },
  { // 1
    _id: new ObjectId(),
    subProgram: subProgram._id,
    misc: 'second session',
    trainer: trainer._id,
    trainees: [],
    companies: [authCompany._id],
    type: INTRA,
    maxTrainees: 8,
    salesRepresentative: vendorAdmin._id,
    expectedBillsCount: 2,
  },
  { // 2
    _id: new ObjectId(),
    subProgram: subProgram._id,
    misc: 'third session',
    trainer: trainerAndCoach._id,
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
    trainees: [],
    companies: [authCompany._id, otherCompany._id],
    type: INTER_B2B,
    salesRepresentative: vendorAdmin._id,
  },
];

const trainerMissionList = [
  {
    _id: new ObjectId(),
    courses: [courseList[3]._id],
    trainer: trainer._id,
    date: '2023-01-03T14:00:00.000Z',
    fee: 1200,
    createdBy: vendorAdmin._id,
    file: { publicId: '123test', link: 'ceciestunlien' },
  },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    SubProgram.create(subProgram),
    Program.create(program),
    Course.create(courseList),
    Step.create(steps),
    TrainerMission.create(trainerMissionList),
  ]);
};

module.exports = { populateDB, courseList };