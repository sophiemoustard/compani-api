const { ObjectId } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const { WEBAPP } = require('../../../src/helpers/constants');
const { CompaniDate } = require('../../../src/helpers/dates/companiDates');
const User = require('../../../src/models/User');
const UserCompany = require('../../../src/models/UserCompany');
const { otherCompany, authCompany, companyWithoutSubscription } = require('../../seed/authCompaniesSeed');
const { clientAdminRoleId, trainerRoleId, helperRoleId, coachRoleId } = require('../../seed/authRolesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/db');

const emailUser = {
  _id: new ObjectId(),
  identity: { firstname: 'emailUser', lastname: 'Test' },
  local: { email: 'email_user@alenvi.io' },
  refreshToken: uuidv4(),
  role: { client: clientAdminRoleId },
  origin: WEBAPP,
};

const emailUserFromOtherCompany = {
  _id: new ObjectId(),
  identity: { firstname: 'otherCompany', lastname: 'Test' },
  local: { email: 'email_user_other_company@alenvi.io' },
  refreshToken: uuidv4(),
  role: { client: clientAdminRoleId },
  origin: WEBAPP,
};

const coachFromOtherCompany = {
  _id: new ObjectId(),
  identity: { firstname: 'coach', lastname: 'Test' },
  local: { email: 'coach_email_user@alenvi.io' },
  refreshToken: uuidv4(),
  role: { client: coachRoleId },
  origin: WEBAPP,
};

const trainerFromOtherCompany = {
  _id: new ObjectId(),
  identity: { firstname: 'trainer', lastname: 'Test' },
  local: { email: 'trainer_email_other_company@alenvi.io' },
  refreshToken: uuidv4(),
  role: { vendor: trainerRoleId },
  origin: WEBAPP,
};

const helperFromOtherCompany = {
  _id: new ObjectId(),
  identity: { firstname: 'helper', lastname: 'Test' },
  local: { email: 'helper_email_user@alenvi.io' },
  refreshToken: uuidv4(),
  role: { client: helperRoleId },
  origin: WEBAPP,
};

const futureTraineeFromAuthCompany = {
  _id: new ObjectId(),
  identity: { firstname: 'future', lastname: 'Trainee' },
  local: { email: 'future_trainee@alenvi.io' },
  refreshToken: uuidv4(),
  origin: WEBAPP,
};

const emailUserFromThirdCompany = {
  _id: new ObjectId(),
  identity: { firstname: 'third', lastname: 'Trainee' },
  local: { email: 'third_trainee@alenvi.io' },
  refreshToken: uuidv4(),
  origin: WEBAPP,
};

const emailUsers = [
  emailUser,
  emailUserFromOtherCompany,
  trainerFromOtherCompany,
  helperFromOtherCompany,
  coachFromOtherCompany,
  futureTraineeFromAuthCompany,
  emailUserFromThirdCompany,
];

const userCompanies = [
  // old inactive user company
  {
    _id: new ObjectId(),
    user: emailUser._id,
    company: companyWithoutSubscription._id,
    startDate: '2022-01-01T23:00:00.000Z',
    endDate: '2022-11-30T23:00:00.000Z',
  },
  { _id: new ObjectId(), user: emailUser._id, company: authCompany._id },
  { _id: new ObjectId(), user: emailUserFromOtherCompany._id, company: otherCompany._id },
  { _id: new ObjectId(), user: trainerFromOtherCompany._id, company: otherCompany._id },
  { _id: new ObjectId(), user: emailUserFromThirdCompany._id, company: companyWithoutSubscription._id },
  {
    _id: new ObjectId(),
    user: futureTraineeFromAuthCompany._id,
    company: authCompany._id,
    startDate: CompaniDate().add('P1D').toISO(),
  },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([User.create(emailUsers), UserCompany.create(userCompanies)]);
};

module.exports = {
  populateDB,
  emailUser,
  emailUserFromOtherCompany,
  trainerFromOtherCompany,
  helperFromOtherCompany,
  coachFromOtherCompany,
  futureTraineeFromAuthCompany,
  emailUserFromThirdCompany,
};
