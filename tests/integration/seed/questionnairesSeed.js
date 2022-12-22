const { ObjectId } = require('mongodb');
const Questionnaire = require('../../../src/models/Questionnaire');
const Card = require('../../../src/models/Card');
const Course = require('../../../src/models/Course');
const CourseSlot = require('../../../src/models/CourseSlot');
const SubProgram = require('../../../src/models/SubProgram');
const Program = require('../../../src/models/Program');
const UserCompany = require('../../../src/models/UserCompany');
const User = require('../../../src/models/User');
const QuestionnaireHistory = require('../../../src/models/QuestionnaireHistory');
const { userList } = require('../../seed/authUsersSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');
const { TRANSITION, OPEN_QUESTION, INTER_B2B } = require('../../../src/helpers/constants');
const { trainerRoleId } = require('../../seed/authRolesSeed');
const { companyWithoutSubscription } = require('../../seed/authCompaniesSeed');

const cardsList = [
  { _id: new ObjectId(), template: TRANSITION, title: 'test1' },
  { _id: new ObjectId(), template: OPEN_QUESTION, question: 'question?' },
  { _id: new ObjectId(), template: TRANSITION, title: 'test2' },
  { _id: new ObjectId(), template: OPEN_QUESTION, question: 'question?' },
];

const questionnairesList = [
  {
    _id: new ObjectId(),
    name: 'test',
    status: 'draft',
    type: 'expectations',
    cards: [cardsList[0]._id, cardsList[1]._id],
  },
  {
    _id: new ObjectId(),
    name: 'test',
    status: 'published',
    type: 'expectations',
    cards: [cardsList[2]._id, cardsList[3]._id],
  },
];

const courseTrainer = userList.find(user => user.role.vendor === trainerRoleId);

const subProgramsList = [{ _id: new ObjectId(), name: 'sous-programme', steps: [new ObjectId()] }];

const programsList = [{ _id: new ObjectId(), name: 'test', subPrograms: [subProgramsList[0]._id] }];

const coursesList = [
  {
    _id: new ObjectId(),
    format: 'blended',
    subProgram: subProgramsList[0]._id,
    type: INTER_B2B,
    salesRepresentative: new ObjectId(),
    trainer: courseTrainer._id,
    trainees: [],
    companies: [],
  },
  {
    _id: new ObjectId(),
    format: 'strictly_e_learning',
    subProgram: new ObjectId(),
    type: INTER_B2B,
    salesRepresentative: new ObjectId(),
    trainer: courseTrainer._id,
    trainees: [],
    companies: [],
  },
  {
    _id: new ObjectId(),
    format: 'blended',
    subProgram: new ObjectId(),
    type: INTER_B2B,
    salesRepresentative: new ObjectId(),
    trainer: new ObjectId(),
    trainees: [],
    companies: [],
  },
];

const traineeList = [{
  _id: new ObjectId(),
  serialNumber: '274124',
  local: { email: 'trainee@email.it' },
  identity: { lastname: 'Personne' },
  origin: 'webapp',
}];

const traineeCompanyList = [
  // old inactive user company
  {
    _id: new ObjectId(),
    user: traineeList[0]._id,
    company: companyWithoutSubscription._id,
    startDate: '2022-01-01T23:00:00.000Z',
    endDate: '2022-11-30T23:00:00.000Z',
  },
  { _id: new ObjectId(), user: traineeList[0]._id, company: new ObjectId() },
];

const slots = [{
  startDate: new Date('2021-04-20T09:00:00'),
  endDate: new Date('2021-04-20T11:00:00'),
  course: coursesList[0],
  step: new ObjectId(),
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
    User.create(traineeList),
    UserCompany.create(traineeCompanyList),
    Questionnaire.create(questionnairesList),
    Card.create(cardsList),
    Course.create(coursesList),
    CourseSlot.create(slots),
    SubProgram.create(subProgramsList),
    Program.create(programsList),
    QuestionnaireHistory.create(questionnaireHistories),
  ]);
};

module.exports = {
  populateDB,
  questionnairesList,
  cardsList,
  coursesList,
};
