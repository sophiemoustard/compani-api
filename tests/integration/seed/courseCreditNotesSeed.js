const { ObjectId } = require('mongodb');
const CourseBill = require('../../../src/models/CourseBill');
const { authCompany } = require('../../seed/authCompaniesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');

const courseBillsList = [
  { // 0
    _id: new ObjectId(),
    course: new ObjectId(),
    company: authCompany._id,
    mainFee: { price: 44.88, count: 2 },
    billedAt: '2022-04-07T00:00:00.000Z',
    number: 'FACT-00001',
  },
  { // 1
    _id: new ObjectId(),
    course: new ObjectId(),
    company: authCompany._id,
    mainFee: { price: 65, count: 3, description: 'Salut à toi' },
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
