const { ObjectID } = require('mongodb');
const faker = require('faker');
const PayDocument = require('../../../models/PayDocument');
const User = require('../../../models/User');
const { populateDBForAuthentification, rolesList } = require('./authentificationSeed');
const { PAYSLIP, CERTIFICATE, OTHER } = require('../../../helpers/constants');

const user = {
  _id: new ObjectID(),
  identity: { firstname: 'Bob', lastname: 'Marley' },
  local: { email: 'lala@alenvi.io', password: '123456' },
  role: rolesList[1]._id,
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

  await (new User(user)).save();
  await PayDocument.insertMany(payDocumentsList);
};

module.exports = {
  populateDB,
  payDocumentsList,
  user,
};
