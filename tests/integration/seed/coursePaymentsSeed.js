const { ObjectId } = require('mongodb');
const CourseBill = require('../../../src/models/CourseBill');
const { authCompany } = require('../../seed/authCompaniesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');

const courseBillsList = [
  { // 0
    _id: new ObjectId(),
    course: new ObjectId(),
    company: authCompany._id,
    mainFee: { price: 1200.20, count: 1 },
    billedAt: '2022-03-06T00:00:00.000Z',
    number: 'FACT-00001',
  },
  { // 1
    _id: new ObjectId(),
    course: new ObjectId(),
    company: authCompany._id,
    mainFee: { price: 1200, count: 1, description: 'Lorem ipsum' },
  },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    CourseBill.create(courseBillsList),
  ]);
};

module.exports = {
  populateDB,
  courseBillsList,
};
