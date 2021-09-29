const { ObjectID } = require('mongodb');
const Questionnaire = require('../../../src/models/Questionnaire');
const Card = require('../../../src/models/Card');
const Course = require('../../../src/models/Course');
const CourseSlot = require('../../../src/models/CourseSlot');
const SubProgram = require('../../../src/models/SubProgram');
const Program = require('../../../src/models/Program');
const UserCompany = require('../../../src/models/UserCompany');
const User = require('../../../src/models/User');
const QuestionnaireHistory = require('../../../src/models/QuestionnaireHistory');
const { authCompany } = require('../../seed/authCompaniesSeed');
const { userList } = require('../../seed/authUsersSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');
const { TRANSITION, OPEN_QUESTION } = require('../../../src/helpers/constants');
const { trainerRoleId } = require('../../seed/authRolesSeed');

const cardsList = [
  { _id: new ObjectID(), template: TRANSITION, title: 'test1' },
  { _id: new ObjectID(), template: OPEN_QUESTION, question: 'question?' },
  { _id: new ObjectID(), template: TRANSITION, title: 'test2' },
  { _id: new ObjectID(), template: OPEN_QUESTION, question: 'question?' },
];

const questionnairesList = [
  {
    _id: new ObjectID(),
    name: 'test',
    status: 'draft',
    type: 'expectations',
    cards: [cardsList[0]._id, cardsList[1]._id],
  },
  {
    _id: new ObjectID(),
    name: 'test',
    status: 'published',
    type: 'expectations',
    cards: [cardsList[2]._id, cardsList[3]._id],
  },
];

const courseTrainer = userList.find(user => user.role.vendor === trainerRoleId);

const subProgramsList = [{ _id: new ObjectID(), name: 'sous-programme', steps: [new ObjectID()] }];

const programsList = [{ _id: new ObjectID(), name: 'test', subPrograms: [subProgramsList[0]._id] }];

const coursesList = [
  {
    _id: new ObjectID(),
    format: 'blended',
    subProgram: subProgramsList[0]._id,
    type: 'inter_b2b',
    salesRepresentative: new ObjectID(),
    trainer: courseTrainer._id,
    company: authCompany._id,
  },
  {
    _id: new ObjectID(),
    format: 'strictly_e_learning',
    subProgram: new ObjectID(),
    type: 'inter_b2b',
    salesRepresentative: new ObjectID(),
    trainer: courseTrainer._id,
  },
  {
    _id: new ObjectID(),
    format: 'blended',
    subProgram: new ObjectID(),
    type: 'inter_b2b',
    salesRepresentative: new ObjectID(),
    trainer: new ObjectID(),
  },
];

const traineeList = [{
  _id: new ObjectID(),
  serialNumber: '274124',
  local: { email: 'trainee@email.it' },
  identity: { lastname: 'Personne' },
  origin: 'webapp',
}];

const traineeCompanyList = [{ _id: new ObjectID(), user: traineeList[0]._id, company: new ObjectID() }];

const slots = [{
  startDate: new Date('2021-04-20T09:00:00'),
  endDate: new Date('2021-04-20T11:00:00'),
  course: coursesList[0],
  step: new ObjectID(),
}];

const questionnaireHistories = [{
  course: coursesList[0]._id,
  questionnaire: questionnairesList[0]._id,
  user: traineeList[0]._id,
  questionnaireAnswersList: [{ card: cardsList[1]._id, answerList: ['blabla'] }],
}];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    User.insertMany(traineeList),
    UserCompany.insertMany(traineeCompanyList),
    Questionnaire.insertMany(questionnairesList),
    Card.insertMany(cardsList),
    Course.insertMany(coursesList),
    CourseSlot.insertMany(slots),
    SubProgram.insertMany(subProgramsList),
    Program.insertMany(programsList),
    QuestionnaireHistory.insertMany(questionnaireHistories),
  ]);
};

module.exports = {
  populateDB,
  questionnairesList,
  cardsList,
  coursesList,
};
