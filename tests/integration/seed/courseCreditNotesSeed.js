const { ObjectId } = require('mongodb');
const CourseBill = require('../../../src/models/CourseBill');
const CourseCreditNote = require('../../../src/models/CourseCreditNote');
const CourseCreditNoteNumber = require('../../../src/models/CourseCreditNoteNumber');
const { authCompany } = require('../../seed/authCompaniesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');

const courseBillsList = [
  { // 0 valid bill
    _id: new ObjectId(),
    course: new ObjectId(),
    company: authCompany._id,
    mainFee: { price: 44.88, count: 2 },
    billedAt: '2022-04-07T00:00:00.000Z',
    number: 'FACT-00001',
  },
  { // 1 draft bill
    _id: new ObjectId(),
    course: new ObjectId(),
    company: authCompany._id,
    mainFee: { price: 65, count: 3, description: 'Salut à toi' },
  },
  { // 2 bill cancelled by credit note
    _id: new ObjectId(),
    course: new ObjectId(),
    company: authCompany._id,
    mainFee: { price: 73, count: 1 },
    billedAt: '2022-05-30T10:00:00.000Z',
    number: 'FACT-00002',
  },
];

const courseCreditNote = [
  {
    _id: new ObjectId(),
    number: 'AV-00001',
    courseBill: courseBillsList[2]._id,
    date: '2022-04-08T10:00:00.000Z',
    misc: 'wesh',
    company: authCompany._id,
  },
];

const courseCreditNoteNumber = { seq: 1 };

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    CourseBill.create(courseBillsList),
    CourseCreditNote.create(courseCreditNote),
    CourseCreditNoteNumber.create(courseCreditNoteNumber),
  ]);
};

module.exports = {
  populateDB,
  courseBillsList,
};
