const { ObjectID } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const PayDocument = require('../../../src/models/PayDocument');
const User = require('../../../src/models/User');
const UserCompany = require('../../../src/models/UserCompany');
const { rolesList, authCompany } = require('./authenticationSeed');
const { deleteNonAuthenticationSeeds } = require('./initializeDB');
const { PAYSLIP, CERTIFICATE, OTHER, WEBAPP } = require('../../../src/helpers/constants');

const payDocumentUsers = [
  {
    _id: new ObjectID(),
    identity: { firstname: 'Bob', lastname: 'Marley' },
    local: { email: 'paydocumentauxiliary@alenvi.io', password: '123456!eR' },
    role: { client: rolesList[3]._id },
    refreshToken: uuidv4(),
    origin: WEBAPP,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Bob', lastname: 'Dylan' },
    local: { email: 'paydocumentawc@alenvi.io', password: '123456!eR' },
    role: { client: rolesList[4]._id },
    refreshToken: uuidv4(),
    origin: WEBAPP,
  },
];

const payDocumentUserCompanies = [
  { _id: new ObjectID(), user: payDocumentUsers[0]._id, company: authCompany._id },
  { _id: new ObjectID(), user: payDocumentUsers[1]._id, company: authCompany._id },
];

const otherCompanyId = new ObjectID();

const userFromOtherCompany = {
  company: otherCompanyId,
  _id: new ObjectID(),
  identity: { firstname: 'test', lastname: 'toto' },
  local: { email: 'test@alenvi.io', password: '123456!eR' },
  role: { client: rolesList[1]._id },
  refreshToken: uuidv4(),
  origin: WEBAPP,
};

const payDocumentsList = [{
  _id: new ObjectID(),
  user: payDocumentUsers[0]._id,
  company: authCompany._id,
  nature: PAYSLIP,
  date: new Date('2019-01-01'),
  file: { driveId: 'qwertyuiop', link: 'http://wertyuiop.oiuytre' },
},
{
  _id: new ObjectID(),
  company: authCompany._id,
  user: payDocumentUsers[0]._id,
  nature: CERTIFICATE,
  date: new Date('2019-01-02'),
  file: { driveId: 'qwertyuiop', link: 'http://wertyuiop.oiuytre' },
},
{
  _id: new ObjectID(),
  company: authCompany._id,
  user: payDocumentUsers[0]._id,
  nature: OTHER,
  date: new Date('2019-01-03'),
  file: { driveId: 'qwertyuiop', link: 'http://wertyuiop.oiuytre' },
},
{
  _id: new ObjectID(),
  company: authCompany._id,
  user: payDocumentUsers[0]._id,
  nature: OTHER,
  date: new Date('2019-01-04'),
},
{
  _id: new ObjectID(),
  company: authCompany._id,
  user: payDocumentUsers[1]._id,
  nature: OTHER,
  date: new Date('2019-01-04'),
},
{
  _id: new ObjectID(),
  user: userFromOtherCompany._id,
  company: otherCompanyId,
  nature: OTHER,
  date: new Date('2019-01-04'),
}];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await User.create([...payDocumentUsers, userFromOtherCompany]);
  await UserCompany.insertMany(payDocumentUserCompanies);
  await PayDocument.insertMany(payDocumentsList);
};

module.exports = {
  populateDB,
  payDocumentsList,
  payDocumentUsers,
  payDocumentUserCompanies,
  userFromOtherCompany,
};
