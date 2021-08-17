const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const { ObjectID } = require('mongodb');
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
const { populateDBForAuthentication, authCompany, otherCompany, rolesList } = require('./authenticationSeed');
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
} = require('../../seed/userSeed');
const { COACH, VIDEO, WEBAPP, TRAINER } = require('../../../src/helpers/constants');

const traineeFromOtherCompany = {
  _id: new ObjectID(),
  identity: { firstname: 'Fred', lastname: 'Astaire' },
  local: { email: 'traineeOtherCompany@alenvi.io', password: '123456!eR' },
  role: { client: rolesList.find(role => role.name === 'auxiliary')._id },
  contact: { phone: '0734856751' },
  refreshToken: uuidv4(),
  origin: WEBAPP,
};

const traineeFromAuthCompanyWithFormationExpoToken = {
  _id: new ObjectID(),
  identity: { firstname: 'Trainee', lastname: 'WithExpoToken' },
  local: { email: 'traineeWithExpoToken@alenvi.io', password: '123456!eR' },
  role: { client: rolesList.find(role => role.name === 'auxiliary')._id },
  contact: { phone: '0734856751' },
  refreshToken: uuidv4(),
  origin: WEBAPP,
  formationExpoTokenList: ['ExponentPushToken[jeSuisUnTokenExpo]', 'ExponentPushToken[jeSuisUnAutreTokenExpo]'],
};

const traineeWithoutCompany = {
  _id: new ObjectID(),
  identity: { firstname: 'Salut', lastname: 'Toi' },
  local: { email: 'traineeWithoutCompany@alenvi.io', password: '123456!eR' },
  role: { vendor: rolesList.find(role => role.name === 'trainer')._id },
  refreshToken: uuidv4(),
  origin: WEBAPP,
};

const trainerAndCoach = {
  _id: new ObjectID(),
  identity: { firstname: 'Simon', lastname: 'TrainerAndCoach' },
  refreshToken: uuidv4(),
  local: { email: 'simonDu12@alenvi.io', password: '123456!eR' },
  role: {
    client: rolesList.find(role => role.name === COACH)._id,
    vendor: rolesList.find(role => role.name === TRAINER)._id,
  },
  origin: WEBAPP,
};

const userCompanies = [
  { _id: new ObjectID(), user: traineeFromOtherCompany._id, company: otherCompany._id },
  { _id: new ObjectID(), user: traineeFromAuthCompanyWithFormationExpoToken._id, company: authCompany._id },
  { _id: new ObjectID(), user: trainerAndCoach._id, company: authCompany._id },
];

const cardsList = [
  { _id: new ObjectID(), template: 'title_text' },
  { _id: new ObjectID(), template: 'survey' },
  { _id: new ObjectID(), template: 'survey' },
];

const activitiesList = [
  { _id: new ObjectID(), name: 'great activity', type: VIDEO, cards: [cardsList[0]._id] },
  { _id: new ObjectID(), name: 'great activity', type: VIDEO, cards: [cardsList[1]._id] },
];
const activitiesHistory = [
  { _id: new ObjectID(), user: coach._id, activity: activitiesList[0]._id },
  { _id: new ObjectID(), user: clientAdmin._id, activity: activitiesList[0]._id },
  { _id: new ObjectID(), user: helper._id, activity: activitiesList[0]._id },
  { _id: new ObjectID(), user: auxiliary._id, activity: activitiesList[0]._id },
  { _id: new ObjectID(), user: auxiliaryWithoutCompany._id, activity: activitiesList[0]._id },
  { _id: new ObjectID(), user: trainerOrganisationManager._id, activity: activitiesList[0]._id },
  { _id: new ObjectID(), user: trainer._id, activity: activitiesList[0]._id },
  { _id: new ObjectID(), user: noRoleNoCompany._id, activity: activitiesList[0]._id },
  {
    _id: new ObjectID(),
    user: coach._id,
    activity: activitiesList[1]._id,
    questionnaireAnswersList: [{ card: cardsList[0]._id, answerList: ['3'] }],
  },
];

const step = { _id: new ObjectID(), name: 'etape', type: 'on_site', activities: activitiesList.map(a => a._id) };

const subProgramsList = [{ _id: new ObjectID(), name: 'sous-programme', steps: [step._id] }];

const programsList = [
  {
    _id: new ObjectID(),
    name: 'program',
    learningGoals: 'on est là',
    image: { link: 'belle/url', publicId: '12345' },
    description: 'Ceci est une description',
    subPrograms: [subProgramsList[0]._id],
  },
  { _id: new ObjectID(), name: 'training program', image: { link: 'belle/url', publicId: '12345' } },
];

const coursesList = [
  {
    _id: new ObjectID(),
    subProgram: subProgramsList[0]._id,
    company: authCompany._id,
    misc: 'first session',
    trainer: trainer._id,
    trainees: [coach._id, helper._id, clientAdmin._id, trainer._id],
    type: 'intra',
    salesRepresentative: vendorAdmin._id,
  },
  {
    _id: new ObjectID(),
    subProgram: subProgramsList[0]._id,
    company: otherCompany._id,
    misc: 'team formation',
    trainer: new ObjectID(),
    trainees: [traineeFromOtherCompany._id, coach._id],
    type: 'intra',
    salesRepresentative: vendorAdmin._id,
  },
  {
    _id: new ObjectID(),
    subProgram: subProgramsList[0]._id,
    company: authCompany._id,
    misc: 'second session',
    trainer: trainer._id,
    type: 'intra',
    trainees: [coach._id, helper._id, trainerOrganisationManager._id, clientAdmin._id, auxiliary._id],
    salesRepresentative: vendorAdmin._id,
  },
  {
    _id: new ObjectID(),
    subProgram: subProgramsList[0]._id,
    company: otherCompany._id,
    misc: 'second team formation',
    type: 'intra',
    trainees: [coach._id, clientAdmin._id],
    salesRepresentative: vendorAdmin._id,
    trainer: trainerAndCoach._id,
  },
  { // course without slots
    _id: new ObjectID(),
    subProgram: subProgramsList[0]._id,
    misc: 'inter b2b session concerning auth company',
    type: 'inter_b2b',
    trainees: [traineeFromOtherCompany._id, coach._id, traineeFromAuthCompanyWithFormationExpoToken._id],
    format: 'strictly_e_learning',
    trainer: trainer._id,
    salesRepresentative: vendorAdmin._id,
  },
  { // course with slots
    _id: new ObjectID(),
    subProgram: subProgramsList[0]._id,
    misc: 'inter b2b session NOT concerning auth company',
    type: 'inter_b2b',
    format: 'strictly_e_learning',
    trainees: [noRoleNoCompany._id],
    salesRepresentative: vendorAdmin._id,
  },
  { // course without trainees and slots
    _id: new ObjectID(),
    subProgram: subProgramsList[0]._id,
    misc: 'inter b2b session NOT concerning auth company',
    type: 'inter_b2b',
    format: 'strictly_e_learning',
    salesRepresentative: vendorAdmin._id,
  },
  { // course with slots to plan
    _id: new ObjectID(),
    subProgram: subProgramsList[0]._id,
    misc: 'inter b2b session NOT concerning auth company',
    type: 'inter_b2b',
    format: 'strictly_e_learning',
    salesRepresentative: vendorAdmin._id,
  },
  { // course with access rules
    _id: new ObjectID(),
    subProgram: subProgramsList[0]._id,
    misc: 'inter_b2b with accessRules',
    type: 'inter_b2b',
    format: 'strictly_e_learning',
    trainees: [coach._id],
    accessRules: [authCompany._id, new ObjectID()],
    salesRepresentative: vendorAdmin._id,
  },
  { // course with access rules and trainee that can't have access to the course but has already suscribed
    _id: new ObjectID(),
    subProgram: subProgramsList[0]._id,
    misc: 'inter_b2b with accessRules',
    type: 'inter_b2b',
    format: 'strictly_e_learning',
    trainees: [coach._id, traineeFromOtherCompany._id],
    accessRules: [authCompany._id, new ObjectID()],
    salesRepresentative: vendorAdmin._id,
  },
  { // course with contact
    _id: new ObjectID(),
    subProgram: subProgramsList[0]._id,
    trainer: coach._id,
    misc: 'inter_b2b',
    type: 'inter_b2b',
    trainees: [traineeFromOtherCompany._id],
    contact: { name: 'Romain Delendarroze', email: 'romainlebg77@gmail.com', phone: '0123456789' },
    salesRepresentative: vendorAdmin._id,
  },
  { // course without authCompany in access rules (11ème position)
    _id: new ObjectID(),
    subProgram: subProgramsList[0]._id,
    misc: 'inter_b2b',
    type: 'inter_b2b',
    format: 'strictly_e_learning',
    trainees: [traineeFromOtherCompany._id, coach._id],
    accessRules: [otherCompany._id],
    salesRepresentative: vendorAdmin._id,
  },
];

const questionnaire = {
  _id: new ObjectID(),
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
    step: step._id,
  },
  {
    startDate: moment('2020-03-20T14:00:00').toDate(),
    endDate: moment('2020-03-20T18:00:00').toDate(),
    course: coursesList[0],
    step: step._id,
  },
  {
    startDate: moment('2020-03-20T09:00:00').toDate(),
    endDate: moment('2020-03-20T11:00:00').toDate(),
    course: coursesList[1],
    step: step._id,
  },
  {
    startDate: moment('2020-03-20T09:00:00').toDate(),
    endDate: moment('2020-03-20T11:00:00').toDate(),
    course: coursesList[2],
    step: step._id,
  },
  {
    startDate: moment('2020-03-20T09:00:00').toDate(),
    endDate: moment('2020-03-20T11:00:00').toDate(),
    course: coursesList[3],
    step: step._id,
  },
  { course: coursesList[3] },
  {
    startDate: moment('2020-03-20T09:00:00').toDate(),
    endDate: moment('2020-03-20T11:00:00').toDate(),
    course: coursesList[5],
    step: step._id,
  },
  { course: coursesList[7] },
];

const populateDB = async () => {
  await Course.deleteMany();
  await SubProgram.deleteMany();
  await Program.deleteMany();
  await User.deleteMany();
  await CourseSlot.deleteMany();
  await CourseSmsHistory.deleteMany();
  await Step.deleteMany();
  await Activity.deleteMany();
  await Card.deleteMany();
  await ActivityHistory.deleteMany();
  await UserCompany.deleteMany();
  await Questionnaire.deleteMany();
  await QuestionnaireHistory.deleteMany();

  await populateDBForAuthentication();

  await SubProgram.insertMany(subProgramsList);
  await Program.insertMany(programsList);
  await Course.insertMany(coursesList);
  await CourseSlot.insertMany(slots);
  await User.create([traineeFromOtherCompany, traineeWithoutCompany, traineeFromAuthCompanyWithFormationExpoToken]);
  await new User(trainerAndCoach).save();
  await CourseSmsHistory.create(courseSmsHistory);
  await Step.create(step);
  await Activity.insertMany(activitiesList);
  await Card.insertMany(cardsList);
  await ActivityHistory.insertMany(activitiesHistory);
  await UserCompany.insertMany(userCompanies);
  await Questionnaire.create(questionnaire);
  await QuestionnaireHistory.create(questionnaireHistory);
};

module.exports = {
  populateDB,
  activitiesList,
  step,
  coursesList,
  subProgramsList,
  programsList,
  traineeFromOtherCompany,
  traineeWithoutCompany,
  courseSmsHistory,
  slots,
  traineeFromAuthCompanyWithFormationExpoToken,
  userCompanies,
  trainerAndCoach,
};
