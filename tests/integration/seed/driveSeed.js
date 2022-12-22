const { ObjectId } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const { WEBAPP } = require('../../../src/helpers/constants');
const User = require('../../../src/models/User');
const UserCompany = require('../../../src/models/UserCompany');
const { clientAdminRoleId } = require('../../seed/authRolesSeed');
const { authCompany, companyWithoutSubscription } = require('../../seed/authCompaniesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');

const auxiliary = {
  _id: new ObjectId(),
  identity: { firstname: 'Harry', lastname: 'Potter' },
  local: { email: 'h@p.com' },
  administrative: {
    driveFolder: { driveId: '1234567890' },
    passport: { driveId: '1234567890', link: 'https://test.com/1234567890' },
  },
  refreshToken: uuidv4(),
  role: { client: clientAdminRoleId },
  origin: WEBAPP,
};

const userCompanies = [
  // old inactive user company
  {
    _id: new ObjectId(),
    user: auxiliary._id,
    company: companyWithoutSubscription._id,
    startDate: '2022-01-01T23:00:00.000Z',
    endDate: '2022-11-30T23:00:00.000Z',
  },
  { _id: new ObjectId(), user: auxiliary._id, company: authCompany._id },
];
const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([User.create(auxiliary), UserCompany.create(userCompanies)]);
};

module.exports = { populateDB, auxiliary };
