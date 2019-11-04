const { ObjectID } = require('mongodb');
const uuidv4 = require('uuid/v4');
const PayDocument = require('../../../src/models/PayDocument');
const User = require('../../../src/models/User');
const { populateDBForAuthentication, rolesList } = require('./authenticationSeed');
const { PAYSLIP, CERTIFICATE, OTHER } = require('../../../src/helpers/constants');

const payDocumentUser = {
  _id: new ObjectID(),
  identity: { firstname: 'Bob', lastname: 'Marley' },
  local: { email: 'paydocumentauxiliary@alenvi.io', password: '123456' },
  role: rolesList[1]._id,
  refreshToken: uuidv4(),
};

const payDocumentsList = [{
  _id: new ObjectID(),
  nature: PAYSLIP,
  date: new Date('2019-01-01'),
  file: { driveId: 'qwertyuiop', link: 'http://wertyuiop.oiuytre' },
}, {
  _id: new ObjectID(),
  nature: CERTIFICATE,
  date: new Date('2019-01-02'),
  file: { driveId: 'qwertyuiop', link: 'http://wertyuiop.oiuytre' },
}, {
  _id: new ObjectID(),
  nature: OTHER,
  date: new Date('2019-01-03'),
  file: { driveId: 'qwertyuiop', link: 'http://wertyuiop.oiuytre' },
}, {
  _id: new ObjectID(),
  nature: OTHER,
  date: new Date('2019-01-04'),
}];

const populateDB = async () => {
  await User.deleteMany({});
  await PayDocument.deleteMany({});

  await populateDBForAuthentication();

  await (new User(payDocumentUser)).save();
  await PayDocument.insertMany(payDocumentsList);
};

module.exports = {
  populateDB,
  payDocumentsList,
  payDocumentUser,
};
