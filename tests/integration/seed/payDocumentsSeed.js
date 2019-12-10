const { ObjectID } = require('mongodb');
const uuidv4 = require('uuid/v4');
const PayDocument = require('../../../src/models/PayDocument');
const User = require('../../../src/models/User');
const { populateDBForAuthentication, rolesList, authCompany } = require('./authenticationSeed');
const { PAYSLIP, CERTIFICATE, OTHER } = require('../../../src/helpers/constants');

const payDocumentUser = {
  _id: new ObjectID(),
  identity: { firstname: 'Bob', lastname: 'Marley' },
  local: { email: 'paydocumentauxiliary@alenvi.io', password: '123456' },
  role: rolesList[1]._id,
  refreshToken: uuidv4(),
  company: authCompany._id,
};

const payDocumentsList = [{
  _id: new ObjectID(),
  company: authCompany._id,
  nature: PAYSLIP,
  date: new Date('2019-01-01'),
  file: { driveId: 'qwertyuiop', link: 'http://wertyuiop.oiuytre' },
}, {
  _id: new ObjectID(),
  company: authCompany._id,
  nature: CERTIFICATE,
  date: new Date('2019-01-02'),
  file: { driveId: 'qwertyuiop', link: 'http://wertyuiop.oiuytre' },
}, {
  _id: new ObjectID(),
  company: authCompany._id,
  nature: OTHER,
  date: new Date('2019-01-03'),
  file: { driveId: 'qwertyuiop', link: 'http://wertyuiop.oiuytre' },
}, {
  _id: new ObjectID(),
  company: authCompany._id,
  nature: OTHER,
  date: new Date('2019-01-04'),
}];

const userFromOtherCompany = {
  company: new ObjectID(),
  _id: new ObjectID(),
  identity: {
    firstname: 'test',
    lastname: 'toto',
  },
  local: { email: 'test@alenvi.io', password: '1234' },
  role: rolesList[1]._id,
  refreshToken: uuidv4(),
};

const populateDB = async () => {
  await User.deleteMany({});
  await PayDocument.deleteMany({});

  await populateDBForAuthentication();

  await (new User(payDocumentUser)).save();
  await (new User(userFromOtherCompany)).save();
  await PayDocument.insertMany(payDocumentsList);
};

module.exports = {
  populateDB,
  payDocumentsList,
  payDocumentUser,
  userFromOtherCompany,
};
