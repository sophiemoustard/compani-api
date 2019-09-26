const { ObjectID } = require('mongodb');
const uuidv4 = require('uuid/v4');
const faker = require('faker');
const PayDocument = require('../../../src/models/PayDocument');
const User = require('../../../src/models/User');
const { populateDBForAuthentification, rolesList } = require('./authentificationSeed');
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
  file: { driveId: faker.random.alphaNumeric(8), link: faker.internet.url() },
}, {
  _id: new ObjectID(),
  nature: CERTIFICATE,
  date: new Date('2019-01-02'),
  file: { driveId: faker.random.alphaNumeric(8), link: faker.internet.url() },
}, {
  _id: new ObjectID(),
  nature: OTHER,
  date: new Date('2019-01-03'),
  file: { driveId: faker.random.alphaNumeric(8), link: faker.internet.url() },
}, {
  _id: new ObjectID(),
  nature: OTHER,
  date: new Date('2019-01-04'),
}];

const populateDB = async () => {
  await User.deleteMany({});
  await PayDocument.deleteMany({});

  await populateDBForAuthentification();

  await (new User(payDocumentUser)).save();
  await PayDocument.insertMany(payDocumentsList);
};

module.exports = {
  populateDB,
  payDocumentsList,
  payDocumentUser,
};
