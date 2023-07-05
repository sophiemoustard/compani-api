const { ObjectId } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const PayDocument = require('../../../src/models/PayDocument');
const User = require('../../../src/models/User');
const UserCompany = require('../../../src/models/UserCompany');
const { authCompany, companyWithoutSubscription } = require('../../seed/authCompaniesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/db');
const { PAYSLIP, CERTIFICATE, OTHER, WEBAPP } = require('../../../src/helpers/constants');
const { auxiliaryWithoutCompanyRoleId, auxiliaryRoleId, clientAdminRoleId } = require('../../seed/authRolesSeed');

const payDocumentUsers = [
  {
    _id: new ObjectId(),
    identity: { firstname: 'Bob', lastname: 'Marley' },
    local: { email: 'paydocumentauxiliary@alenvi.io' },
    role: { client: auxiliaryRoleId },
    refreshToken: uuidv4(),
    origin: WEBAPP,
  },
  {
    _id: new ObjectId(),
    identity: { firstname: 'Bob', lastname: 'Dylan' },
    local: { email: 'paydocumentawc@alenvi.io', password: '123456!eR' },
    role: { client: auxiliaryWithoutCompanyRoleId },
    refreshToken: uuidv4(),
    origin: WEBAPP,
  },
];

const payDocumentUserCompanies = [
  // old inactive user company
  {
    _id: new ObjectId(),
    user: payDocumentUsers[0]._id,
    company: companyWithoutSubscription._id,
    startDate: '2022-01-01T23:00:00.000Z',
    endDate: '2022-11-30T23:00:00.000Z',
  },
  { _id: new ObjectId(), user: payDocumentUsers[0]._id, company: authCompany._id },
  { _id: new ObjectId(), user: payDocumentUsers[1]._id, company: authCompany._id },
];

const otherCompanyId = new ObjectId();

const userFromOtherCompany = {
  company: otherCompanyId,
  _id: new ObjectId(),
  identity: { firstname: 'test', lastname: 'toto' },
  local: { email: 'test@alenvi.io' },
  role: { client: clientAdminRoleId },
  refreshToken: uuidv4(),
  origin: WEBAPP,
};

const payDocumentsList = [{
  _id: new ObjectId(),
  user: payDocumentUsers[0]._id,
  company: authCompany._id,
  nature: PAYSLIP,
  date: new Date('2019-01-01'),
  file: { driveId: 'qwertyuiop', link: 'http://wertyuiop.oiuytre' },
},
{
  _id: new ObjectId(),
  company: authCompany._id,
  user: payDocumentUsers[0]._id,
  nature: CERTIFICATE,
  date: new Date('2019-01-02'),
  file: { driveId: 'qwertyuiop', link: 'http://wertyuiop.oiuytre' },
},
{
  _id: new ObjectId(),
  company: authCompany._id,
  user: payDocumentUsers[0]._id,
  nature: OTHER,
  date: new Date('2019-01-03'),
  file: { driveId: 'qwertyuiop', link: 'http://wertyuiop.oiuytre' },
},
{
  _id: new ObjectId(),
  company: authCompany._id,
  user: payDocumentUsers[0]._id,
  nature: OTHER,
  date: new Date('2019-01-04'),
},
{
  _id: new ObjectId(),
  company: authCompany._id,
  user: payDocumentUsers[1]._id,
  nature: OTHER,
  date: new Date('2019-01-04'),
},
{
  _id: new ObjectId(),
  user: userFromOtherCompany._id,
  company: otherCompanyId,
  nature: OTHER,
  date: new Date('2019-01-04'),
}];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    User.create([...payDocumentUsers, userFromOtherCompany]),
    UserCompany.create(payDocumentUserCompanies),
    PayDocument.create(payDocumentsList),
  ]);
};

module.exports = {
  populateDB,
  payDocumentsList,
  payDocumentUsers,
  payDocumentUserCompanies,
  userFromOtherCompany,
};
