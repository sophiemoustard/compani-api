const { ObjectID } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const PayDocument = require('../../../src/models/PayDocument');
const User = require('../../../src/models/User');
const UserCompany = require('../../../src/models/UserCompany');
const { populateDBForAuthentication, rolesList, authCompany, getUser } = require('./authenticationSeed');
const { PAYSLIP, CERTIFICATE, OTHER, WEBAPP } = require('../../../src/helpers/constants');

const payDocumentUser = {
  _id: new ObjectID(),
  identity: { firstname: 'Bob', lastname: 'Marley' },
  local: { email: 'paydocumentauxiliary@alenvi.io', password: '123456!eR' },
  role: { client: rolesList[1]._id },
  refreshToken: uuidv4(),
  company: authCompany._id,
  origin: WEBAPP,
};

const payDocumentUserCompany = {
  user: payDocumentUser._id,
  company: authCompany._id,
};

const user = getUser('auxiliary_without_company');

const userCompanyWithoutCompany = { user: user._id, company: authCompany._id };

const otherCompanyId = new ObjectID();

const userFromOtherCompany = {
  company: otherCompanyId,
  _id: new ObjectID(),
  identity: {
    firstname: 'test',
    lastname: 'toto',
  },
  local: { email: 'test@alenvi.io', password: '123456!eR' },
  role: { client: rolesList[1]._id },
  refreshToken: uuidv4(),
  origin: WEBAPP,
};

const payDocumentsList = [{
  _id: new ObjectID(),
  user: payDocumentUser._id,
  company: authCompany._id,
  nature: PAYSLIP,
  date: new Date('2019-01-01'),
  file: { driveId: 'qwertyuiop', link: 'http://wertyuiop.oiuytre' },
},
{
  _id: new ObjectID(),
  company: authCompany._id,
  user: payDocumentUser._id,
  nature: CERTIFICATE,
  date: new Date('2019-01-02'),
  file: { driveId: 'qwertyuiop', link: 'http://wertyuiop.oiuytre' },
},
{
  _id: new ObjectID(),
  company: authCompany._id,
  user: payDocumentUser._id,
  nature: OTHER,
  date: new Date('2019-01-03'),
  file: { driveId: 'qwertyuiop', link: 'http://wertyuiop.oiuytre' },
},
{
  _id: new ObjectID(),
  company: authCompany._id,
  user: payDocumentUser._id,
  nature: OTHER,
  date: new Date('2019-01-04'),
},
{
  _id: new ObjectID(),
  company: authCompany._id,
  user: getUser('auxiliary_without_company')._id,
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
  await User.deleteMany();
  await UserCompany.deleteMany();
  await PayDocument.deleteMany();

  await populateDBForAuthentication();

  await User.create([payDocumentUser, userFromOtherCompany]);
  await UserCompany.insertMany([payDocumentUserCompany, userCompanyWithoutCompany]);
  await PayDocument.insertMany(payDocumentsList);
};

module.exports = {
  populateDB,
  payDocumentsList,
  payDocumentUser,
  payDocumentUserCompany,
  userFromOtherCompany,
  userCompanyWithoutCompany,
};
