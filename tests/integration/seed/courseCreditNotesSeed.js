const { ObjectId } = require('mongodb');
const { INTRA } = require('../../../src/helpers/constants');
const CourseBill = require('../../../src/models/CourseBill');
const Course = require('../../../src/models/Course');
const CourseCreditNote = require('../../../src/models/CourseCreditNote');
const CourseCreditNoteNumber = require('../../../src/models/CourseCreditNoteNumber');
const SubProgram = require('../../../src/models/SubProgram');
const VendorCompany = require('../../../src/models/VendorCompany');
const Program = require('../../../src/models/Program');
const { authCompany, otherCompany } = require('../../seed/authCompaniesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');

const subProgramList = [{ _id: new ObjectId(), name: 'subProgram 1', steps: [new ObjectId()] }];

const programList = [{ _id: new ObjectId(), name: 'Program 1', subPrograms: [subProgramList[0]._id] }];

const vendorCompany = {
  name: 'Vendor Company',
  siret: '12345678901234',
  address: {
    fullAddress: '32 Rue du Loup 33000 Bordeaux',
    street: '32 Rue du Loup',
    city: 'Bordeaux',
    zipCode: '33000',
    location: { type: 'Point', coordinates: [-0.573054, 44.837914] },
  },
};

const courseList = [
  { // 0 - linked to bill 2
    _id: new ObjectId(),
    type: INTRA,
    maxTrainees: 8,
    companies: [authCompany._id],
    subProgram: subProgramList[0]._id,
    misc: 'group 1',
    trainer: new ObjectId(),
    salesRepresentative: new ObjectId(),
    contact: new ObjectId(),
    trainees: [new ObjectId()],

  },
];

const courseBillsList = [
  { // 0 valid bill
    _id: new ObjectId(),
    course: new ObjectId(),
    company: authCompany._id,
    payer: { company: authCompany._id },
    mainFee: { price: 44.88, count: 2 },
    billedAt: '2022-04-07T00:00:00.000Z',
    number: 'FACT-00001',
  },
  { // 1 draft bill
    _id: new ObjectId(),
    course: new ObjectId(),
    company: authCompany._id,
    payer: { company: authCompany._id },
    mainFee: { price: 65, count: 3, description: 'Salut à toi' },
  },
  { // 2 bill cancelled by credit note
    _id: new ObjectId(),
    course: courseList[0]._id,
    company: authCompany._id,
    payer: { company: authCompany._id },
    mainFee: { price: 73, count: 1 },
    billedAt: '2022-05-30T10:00:00.000Z',
    number: 'FACT-00002',
  },
  { // 3 bill cancelled by credit note (otherCompany but autCompany as payer)
    _id: new ObjectId(),
    course: courseList[0]._id,
    company: otherCompany._id,
    payer: { company: authCompany._id },
    mainFee: { price: 73, count: 1 },
    billedAt: '2022-05-30T10:00:00.000Z',
    number: 'FACT-00003',
  },
  { // 4 bill cancelled by credit note (otherCompany)
    _id: new ObjectId(),
    course: courseList[0]._id,
    company: otherCompany._id,
    payer: { company: otherCompany._id },
    mainFee: { price: 73, count: 1 },
    billedAt: '2022-05-30T10:00:00.000Z',
    number: 'FACT-00004',
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
  {
    _id: new ObjectId(),
    number: 'AV-00002',
    courseBill: courseBillsList[3]._id,
    date: '2022-04-08T10:00:00.000Z',
    misc: 'wesh',
    company: otherCompany._id,
  },
  {
    _id: new ObjectId(),
    number: 'AV-00003',
    courseBill: courseBillsList[4]._id,
    date: '2022-04-08T10:00:00.000Z',
    misc: 'wesh',
    company: otherCompany._id,
  },
];

const courseCreditNoteNumber = { _id: new ObjectId(), seq: 3 };

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    CourseBill.create(courseBillsList),
    Course.create(courseList),
    CourseCreditNote.create(courseCreditNote),
    CourseCreditNoteNumber.create(courseCreditNoteNumber),
    Program.create(programList),
    SubProgram.create(subProgramList),
    VendorCompany.create(vendorCompany),
  ]);
};

module.exports = {
  populateDB,
  courseBillsList,
  courseCreditNote,
};
