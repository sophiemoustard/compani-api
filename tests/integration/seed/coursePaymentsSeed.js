const { ObjectId } = require('mongodb');
const { PAYMENT, DIRECT_DEBIT } = require('../../../src/helpers/constants');
const CourseBill = require('../../../src/models/CourseBill');
const CoursePaymentNumber = require('../../../src/models/CoursePaymentNumber');
const CoursePayment = require('../../../src/models/CoursePayment');
const { authCompany } = require('../../seed/authCompaniesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/db');

const courseBillsList = [
  { // 0
    _id: new ObjectId(),
    course: new ObjectId(),
    company: authCompany._id,
    mainFee: { price: 1200.20, count: 1 },
    billedAt: '2022-03-06T00:00:00.000Z',
    number: 'FACT-00001',
    payer: { company: authCompany._id },
  },
  { // 1
    _id: new ObjectId(),
    course: new ObjectId(),
    company: authCompany._id,
    mainFee: { price: 1200, count: 1, description: 'Lorem ipsum' },
    payer: { company: authCompany._id },
  },
];

const coursePaymentNumber = {
  _id: new ObjectId(),
  seq: 1,
  nature: PAYMENT,
};

const coursePaymentsList = [
  { // 0
    _id: new ObjectId(),
    number: 'REG-00001',
    date: '2022-03-07T00:00:00.000Z',
    company: authCompany._id,
    courseBill: courseBillsList[0]._id,
    netInclTaxes: 1200,
    nature: PAYMENT,
    type: DIRECT_DEBIT,
  },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    CourseBill.create(courseBillsList),
    CoursePayment.create(coursePaymentsList),
    CoursePaymentNumber.create(coursePaymentNumber),
  ]);
};

module.exports = {
  populateDB,
  courseBillsList,
  coursePaymentsList,
};
