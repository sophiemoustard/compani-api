const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const { ObjectId } = require('mongodb');
const Course = require('../../../src/models/Course');
const Program = require('../../../src/models/Program');
const SubProgram = require('../../../src/models/SubProgram');
const CourseSlot = require('../../../src/models/CourseSlot');
const CourseSmsHistory = require('../../../src/models/CourseSmsHistory');
const User = require('../../../src/models/User');
const Step = require('../../../src/models/Step');
const UserCompany = require('../../../src/models/UserCompany');
const Activity = require('../../../src/models/Activity');
const ActivityHistory = require('../../../src/models/ActivityHistory');
const Card = require('../../../src/models/Card');
const Questionnaire = require('../../../src/models/Questionnaire');
const QuestionnaireHistory = require('../../../src/models/QuestionnaireHistory');
const { authCompany, otherCompany } = require('../../seed/authCompaniesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');
const {
  vendorAdmin,
  noRoleNoCompany,
  auxiliary,
  helper,
  auxiliaryWithoutCompany,
  clientAdmin,
  trainerOrganisationManager,
  coach,
  trainer,
  trainerAndCoach,
} = require('../../seed/authUsersSeed');
const { VIDEO, WEBAPP } = require('../../../src/helpers/constants');
const { auxiliaryRoleId, trainerRoleId } = require('../../seed/authRolesSeed');

const traineeFromOtherCompany = {
  _id: new ObjectId(),
  identity: { firstname: 'Fred', lastname: 'Astaire' },
  local: { email: 'traineeOtherCompany@alenvi.io', password: '123456!eR' },
  role: { client: auxiliaryRoleId },
  contact: { phone: '0734856751' },
  refreshToken: uuidv4(),
  origin: WEBAPP,
};

const traineeFromAuthCompanyWithFormationExpoToken = {
  _id: new ObjectId(),
  identity: { firstname: 'Trainee', lastname: 'WithExpoToken' },
  local: { email: 'traineeWithExpoToken@alenvi.io' },
  role: { client: auxiliaryRoleId },
  contact: { phone: '0734856751' },
  refreshToken: uuidv4(),
  origin: WEBAPP,
  formationExpoTokenList: ['ExponentPushToken[jeSuisUnTokenExpo]', 'ExponentPushToken[jeSuisUnAutreTokenExpo]'],
};

const traineeWithoutCompany = {
  _id: new ObjectId(),
  identity: { firstname: 'Salut', lastname: 'Toi' },
  local: { email: 'traineeWithoutCompany@alenvi.io' },
  role: { vendor: trainerRoleId },
  refreshToken: uuidv4(),
  origin: WEBAPP,
};

const contact = {
  _id: new ObjectId(),
  identity: { firstname: 'Roberto', lastname: 'Benigni' },
  local: { email: 'contact@trainer.io' },
  contact: { phone: '0123456789' },
  role: { vendor: trainerRoleId },
  refreshToken: uuidv4(),
  origin: WEBAPP,
};

const contactWithoutPhone = {
  _id: new ObjectId(),
  identity: { firstname: 'Cathy', lastname: 'Palenne' },
  local: { email: 'contact_withoutphone@trainer.io' },
  role: { vendor: trainerRoleId },
  refreshToken: uuidv4(),
  origin: WEBAPP,
};

const userList = [
  traineeFromOtherCompany,
  traineeFromAuthCompanyWithFormationExpoToken,
  traineeWithoutCompany,
  contact,
  contactWithoutPhone,
];

const userCompanies = [
  { _id: new ObjectId(), user: traineeFromOtherCompany._id, company: otherCompany._id },
  { _id: new ObjectId(), user: traineeFromAuthCompanyWithFormationExpoToken._id, company: authCompany._id },
];

const cardsList = [
  { _id: new ObjectId(), template: 'title_text' },
  { _id: new ObjectId(), template: 'survey' },
  { _id: new ObjectId(), template: 'survey' },
];

const activitiesList = [
  { _id: new ObjectId(), name: 'great activity', type: VIDEO, cards: [cardsList[0]._id] },
  { _id: new ObjectId(), name: 'great activity', type: VIDEO, cards: [cardsList[1]._id] },
];
const activitiesHistory = [
  { _id: new ObjectId(), user: coach._id, activity: activitiesList[0]._id },
  { _id: new ObjectId(), user: clientAdmin._id, activity: activitiesList[0]._id },
  { _id: new ObjectId(), user: helper._id, activity: activitiesList[0]._id },
  { _id: new ObjectId(), user: auxiliary._id, activity: activitiesList[0]._id },
  { _id: new ObjectId(), user: auxiliaryWithoutCompany._id, activity: activitiesList[0]._id },
  { _id: new ObjectId(), user: trainerOrganisationManager._id, activity: activitiesList[0]._id },
  { _id: new ObjectId(), user: trainer._id, activity: activitiesList[0]._id },
  { _id: new ObjectId(), user: noRoleNoCompany._id, activity: activitiesList[0]._id },
  {
    _id: new ObjectId(),
    user: coach._id,
    activity: activitiesList[1]._id,
    questionnaireAnswersList: [{ card: cardsList[0]._id, answerList: ['3'] }],
  },
];

const stepList = [
  { _id: new ObjectId(), name: 'etape', type: 'on_site', activities: activitiesList.map(a => a._id) },
  { _id: new ObjectId(), name: 'etape', type: 'e_learning', activities: activitiesList.map(a => a._id) },
  { _id: new ObjectId(), name: 'etape', type: 'remote', activities: activitiesList.map(a => a._id) },
];

const subProgramsList = [
  { _id: new ObjectId(), name: 'sous-programme 1', steps: [stepList[0]._id] },
  { _id: new ObjectId(), name: 'sous-programme 2', steps: [stepList[1]._id, stepList[2]._id] },
];

const programsList = [
  {
    _id: new ObjectId(),
    name: 'program',
    learningGoals: 'on est là',
    image: { link: 'belle/url', publicId: '12345' },
    description: 'Ceci est une description',
    subPrograms: [subProgramsList[0]._id],
  },
  { _id: new ObjectId(), name: 'training program', image: { link: 'belle/url', publicId: '12345' } },
];

const coursesList = [
  { // 0
    _id: new ObjectId(),
    subProgram: subProgramsList[0]._id,
    company: authCompany._id,
    misc: 'first session',
    trainer: trainer._id,
    trainees: [coach._id, helper._id, clientAdmin._id, trainer._id],
    type: 'intra',
    salesRepresentative: vendorAdmin._id,
  },
  { // 1
    _id: new ObjectId(),
    subProgram: subProgramsList[0]._id,
    contact: contactWithoutPhone._id,
    company: otherCompany._id,
    misc: 'team formation',
    trainer: new ObjectId(),
    trainees: [traineeFromOtherCompany._id],
    type: 'intra',
    salesRepresentative: vendorAdmin._id,
  },
  { // 2
    _id: new ObjectId(),
    subProgram: subProgramsList[0]._id,
    contact: contact._id,
    company: authCompany._id,
    misc: 'second session',
    trainer: trainer._id,
    type: 'intra',
    trainees: [
      coach._id,
      helper._id,
      trainerOrganisationManager._id,
      clientAdmin._id,
      auxiliary._id,
      traineeFromAuthCompanyWithFormationExpoToken._id,
    ],
    salesRepresentative: vendorAdmin._id,
  },
  { // 3
    _id: new ObjectId(),
    subProgram: subProgramsList[0]._id,
    company: otherCompany._id,
    misc: 'second team formation',
    type: 'intra',
    trainees: [coach._id, clientAdmin._id],
    salesRepresentative: vendorAdmin._id,
    trainer: trainerAndCoach._id,
  },
  { // 4 course without slots
    _id: new ObjectId(),
    subProgram: subProgramsList[0]._id,
    misc: 'inter b2b session concerning auth company',
    type: 'inter_b2b',
    trainees: [traineeFromOtherCompany._id, coach._id],
    format: 'blended',
    trainer: trainer._id,
    salesRepresentative: vendorAdmin._id,
  },
  { // 5 course with slots
    _id: new ObjectId(),
    subProgram: subProgramsList[0]._id,
    misc: 'inter b2b session NOT concerning auth company',
    type: 'inter_b2b',
    format: 'blended',
    trainees: [noRoleNoCompany._id],
    salesRepresentative: vendorAdmin._id,
  },
  { // 6 course without trainees and slots
    _id: new ObjectId(),
    subProgram: subProgramsList[0]._id,
    misc: 'inter b2b session NOT concerning auth company',
    type: 'inter_b2b',
    format: 'strictly_e_learning',
    salesRepresentative: vendorAdmin._id,
  },
  { // 7 course with slots to plan
    _id: new ObjectId(),
    subProgram: subProgramsList[0]._id,
    contact: contact._id,
    misc: 'inter b2b session NOT concerning auth company',
    type: 'inter_b2b',
    format: 'blended',
    trainees: [trainer._id],
    trainer: coach._id,
    salesRepresentative: vendorAdmin._id,
  },
  { // 8 course with access rules
    _id: new ObjectId(),
    subProgram: subProgramsList[0]._id,
    contact: contact._id,
    misc: 'inter_b2b with accessRules',
    type: 'inter_b2b',
    format: 'strictly_e_learning',
    trainees: [coach._id, traineeFromOtherCompany._id],
    accessRules: [authCompany._id, new ObjectId()],
    salesRepresentative: vendorAdmin._id,
  },
  { // 9 course with access rules and trainee that can't have access to the course but has already suscribed
    _id: new ObjectId(),
    subProgram: subProgramsList[0]._id,
    trainer: trainer._id,
    misc: 'inter_b2b with accessRules',
    type: 'inter_b2b',
    format: 'strictly_e_learning',
    trainees: [coach._id, traineeFromOtherCompany._id],
    accessRules: [authCompany._id, new ObjectId()],
    salesRepresentative: vendorAdmin._id,
  },
  { // 10 course with contact
    _id: new ObjectId(),
    subProgram: subProgramsList[0]._id,
    trainer: coach._id,
    misc: 'inter_b2b',
    type: 'inter_b2b',
    trainees: [traineeFromOtherCompany._id],
    contact: contact._id,
    salesRepresentative: vendorAdmin._id,
  },
  { // 11 course without authCompany in access rules (11ème position)
    _id: new ObjectId(),
    subProgram: subProgramsList[0]._id,
    misc: 'inter_b2b',
    type: 'inter_b2b',
    format: 'strictly_e_learning',
    trainees: [traineeFromOtherCompany._id, coach._id],
    accessRules: [otherCompany._id],
    salesRepresentative: vendorAdmin._id,
  },
  { // 12 course with no on-site slot
    _id: new ObjectId(),
    subProgram: subProgramsList[1]._id,
    misc: 'inter_b2b',
    type: 'inter_b2b',
    trainees: [coach._id],
    salesRepresentative: vendorAdmin._id,
  },
  { // 13 course without trainee
    _id: new ObjectId(),
    subProgram: subProgramsList[0]._id,
    misc: '',
    type: 'inter_b2b',
    format: 'blended',
    trainer: trainer._id,
    salesRepresentative: vendorAdmin._id,
  },
  { // 14 archived course
    _id: new ObjectId(),
    subProgram: subProgramsList[0]._id,
    company: authCompany._id,
    misc: 'old session',
    trainer: trainer._id,
    trainees: [coach._id, helper._id, clientAdmin._id, trainer._id],
    type: 'intra',
    salesRepresentative: vendorAdmin._id,
    archivedAt: '2021-01-01T00:00:00.000Z',
  },
];

const questionnaire = {
  _id: new ObjectId(),
  name: 'questionnaire',
  status: 'published',
  cards: [cardsList[2]._id],
  type: 'end_of_course',
};
const questionnaireHistory = {
  course: coursesList[0]._id,
  questionnaire: questionnaire._id,
  user: coach._id,
  questionnaireAnswersList: [{ card: cardsList[2]._id, answerList: ['4'] }],
};

const courseSmsHistory = {
  date: '2020-01-01T00:00:00.000Z',
  type: 'convocation',
  message: 'Hola ! This is a test',
  course: coursesList[0]._id,
  sender: trainer._id,
};

const slots = [
  {
    startDate: moment('2020-03-20T09:00:00').toDate(),
    endDate: moment('2020-03-20T11:00:00').toDate(),
    course: coursesList[0],
    step: stepList[0]._id,
  },
  {
    startDate: moment('2020-03-20T14:00:00').toDate(),
    endDate: moment('2020-03-20T18:00:00').toDate(),
    course: coursesList[0],
    step: stepList[0]._id,
  },
  {
    startDate: moment('2020-03-20T09:00:00').toDate(),
    endDate: moment('2020-03-20T11:00:00').toDate(),
    course: coursesList[1],
    step: stepList[0]._id,
  },
  {
    startDate: moment('2020-03-20T09:00:00').toDate(),
    endDate: moment('2020-03-20T11:00:00').toDate(),
    course: coursesList[2],
    step: stepList[0]._id,
  },
  {
    startDate: moment('2020-03-20T09:00:00').toDate(),
    endDate: moment('2020-03-20T11:00:00').toDate(),
    course: coursesList[3],
    step: stepList[0]._id,
  },
  { course: coursesList[3] },
  {
    startDate: moment('2020-03-20T09:00:00').toDate(),
    endDate: moment('2020-03-20T11:00:00').toDate(),
    course: coursesList[5],
    step: stepList[0]._id,
  },
  { course: coursesList[7] },
  {
    startDate: moment('2020-03-20T09:00:00').toDate(),
    endDate: moment('2020-03-20T11:00:00').toDate(),
    course: coursesList[7],
    step: stepList[0]._id,
  },
  {
    startDate: moment('2020-03-20T09:00:00').toDate(),
    endDate: moment('2020-03-20T11:00:00').toDate(),
    course: coursesList[8],
    step: stepList[0]._id,
  },
  {
    startDate: moment('2020-03-20T09:00:00').toDate(),
    endDate: moment('2020-03-20T11:00:00').toDate(),
    course: coursesList[9],
    step: stepList[0]._id,
  },
  {
    startDate: moment('2020-03-20T09:00:00').toDate(),
    endDate: moment('2020-03-20T11:00:00').toDate(),
    course: coursesList[13],
    step: stepList[0]._id,
  },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    Activity.create(activitiesList),
    ActivityHistory.create(activitiesHistory),
    Card.create(cardsList),
    Course.create(coursesList),
    CourseSlot.create(slots),
    CourseSmsHistory.create(courseSmsHistory),
    Program.create(programsList),
    Questionnaire.create(questionnaire),
    QuestionnaireHistory.create(questionnaireHistory),
    Step.create(stepList),
    SubProgram.create(subProgramsList),
    User.create(userList),
    UserCompany.create(userCompanies),
  ]);
};

module.exports = {
  populateDB,
  activitiesList,
  stepList,
  coursesList,
  subProgramsList,
  programsList,
  traineeFromOtherCompany,
  traineeWithoutCompany,
  courseSmsHistory,
  slots,
  traineeFromAuthCompanyWithFormationExpoToken,
  userCompanies,
};
