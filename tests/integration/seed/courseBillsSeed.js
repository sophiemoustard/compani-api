const { ObjectId } = require('mongodb');
const { INTRA } = require('../../../src/helpers/constants');
const Company = require('../../../src/models/Company');
const Course = require('../../../src/models/Course');
const CourseBill = require('../../../src/models/CourseBill');
const CourseBillingItem = require('../../../src/models/CourseBillingItem');
const CourseBillsNumber = require('../../../src/models/CourseBillsNumber');
const CourseFundingOrganisation = require('../../../src/models/CourseFundingOrganisation');
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

const companyWithoutAddress = {
  _id: ObjectId(),
  name: 'Structure sans adresse',
  prefixNumber: 45,
  folderId: '0987654321',
  directDebitsFolderId: '1234567890',
  customersFolderId: 'asfdhljk',
  auxiliariesFolderId: 'erqutop',
};

const courseList = [
  { // 0 - linked to bill 0
    _id: new ObjectId(),
    type: INTRA,
    company: authCompany._id,
    subProgram: new ObjectId(),
    misc: 'group 1',
    trainer: new ObjectId(),
    salesRepresentative: new ObjectId(),
    contact: new ObjectId(),
    trainees: [new ObjectId()],

  },
  { // 1 - linked to bill 1
    _id: new ObjectId(),
    type: INTRA,
    company: authCompany._id,
    subProgram: new ObjectId(),
    misc: 'group 2',
    trainer: new ObjectId(),
    salesRepresentative: new ObjectId(),
    contact: new ObjectId(),
    trainees: [new ObjectId()],

  },
  { // 2 - without bill
    _id: new ObjectId(),
    type: INTRA,
    company: otherCompany._id,
    subProgram: subProgramList[0]._id,
    misc: 'group 3',
    trainer: new ObjectId(),
    salesRepresentative: new ObjectId(),
    contact: new ObjectId(),
    trainees: [new ObjectId()],
  },
  { // 3 - linked to bill 2
    _id: new ObjectId(),
    type: INTRA,
    company: authCompany._id,
    subProgram: subProgramList[0]._id,
    misc: 'group 4',
    trainer: new ObjectId(),
    salesRepresentative: new ObjectId(),
    contact: new ObjectId(),
    trainees: [new ObjectId()],
  },
  { // 4 - linked to bill 3
    _id: new ObjectId(),
    type: INTRA,
    company: authCompany._id,
    subProgram: new ObjectId(),
    misc: 'group 5',
    trainer: new ObjectId(),
    salesRepresentative: new ObjectId(),
    contact: new ObjectId(),
    trainees: [new ObjectId()],
  },
  { // 5 - linked to bill 4
    _id: new ObjectId(),
    type: INTRA,
    company: authCompany._id,
    subProgram: new ObjectId(),
    misc: 'group 6',
    trainer: new ObjectId(),
    salesRepresentative: new ObjectId(),
    contact: new ObjectId(),
    trainees: [new ObjectId()],
  },
  { // 6 - linked to bill 5
    _id: new ObjectId(),
    type: INTRA,
    company: companyWithoutAddress._id,
    subProgram: new ObjectId(),
    misc: 'group 7',
    trainer: new ObjectId(),
    salesRepresentative: new ObjectId(),
    contact: new ObjectId(),
    trainees: [],
  },
];
const courseFundingOrganisationList = [
  {
    _id: new ObjectId(),
    name: 'APA Paris',
    address: {
      street: '1 avenue Denfert Rochereau',
      zipCode: '75014',
      city: 'Paris',
      fullAddress: '1 avenue Denfert Rochereau 75014 Paris',
      location: { type: 'Point', coordinates: [2.0987, 1.2345] },
    },
  },
  {
    _id: new ObjectId(),
    name: 'APA Lyon',
    address: {
      street: '1 avenue Denfert Rochereau',
      zipCode: '69002',
      city: 'Lyon',
      fullAddress: '1 avenue Denfert Rochereau 69002 Lyon',
      location: { type: 'Point', coordinates: [2.0987, 1.2345] },
    },
  },
];

const billingItemList = [
  { _id: new ObjectId(), name: 'frais formateur' },
  { _id: new ObjectId(), name: 'forfait salle' },
  { _id: new ObjectId(), name: 'petit déjeuner' },
];

const courseBillNumber = { _id: new ObjectId(), seq: 3 };

const courseBillsList = [
  { // 0
    _id: new ObjectId(),
    course: courseList[0]._id,
    company: authCompany._id,
    mainFee: { price: 120, count: 1 },
    payer: { company: authCompany._id },
    billingPurchaseList: [
      { _id: new ObjectId(), billingItem: billingItemList[0]._id, price: 90, count: 1 },
      { _id: new ObjectId(), billingItem: billingItemList[1]._id, price: 400, count: 1 },
    ],
  },
  { // 1 - with funder and mainFee description
    _id: new ObjectId(),
    course: courseList[1]._id,
    company: authCompany._id,
    mainFee: { price: 120, count: 1, description: 'Lorem ipsum' },
    payer: { fundingOrganisation: courseFundingOrganisationList[0]._id },
  },
  { // 2 - already billed without funder
    _id: new ObjectId(),
    course: courseList[3]._id,
    company: authCompany._id,
    payer: { company: authCompany._id },
    mainFee: { price: 120, count: 1, description: 'Lorem ipsum' },
    billedAt: '2022-03-07T00:00:00.000Z',
    number: 'FACT-00001',
    billingPurchaseList: [
      { _id: new ObjectId(), billingItem: billingItemList[0]._id, price: 9, count: 1, description: 'BN du goûter' },
    ],
  },
  { // 3 - purchase with description
    _id: new ObjectId(),
    course: courseList[4]._id,
    company: authCompany._id,
    payer: { company: authCompany._id },
    mainFee: { price: 10, count: 1 },
    billingPurchaseList: [
      { _id: new ObjectId(), billingItem: billingItemList[0]._id, price: 12, count: 7, description: 'soupe du soir' },
    ],
  },
  { // 4 - already billed with funder
    _id: new ObjectId(),
    course: courseList[5]._id,
    company: authCompany._id,
    mainFee: { price: 200, count: 2, description: 'Salut' },
    billedAt: '2022-04-07T00:00:00.000Z',
    number: 'FACT-00002',
    payer: { fundingOrganisation: courseFundingOrganisationList[0]._id },
    billingPurchaseList: [
      { _id: new ObjectId(), billingItem: billingItemList[0]._id, price: 9, count: 1 },
    ],
  },
  { // 5 - client company without address
    _id: new ObjectId(),
    course: courseList[6]._id,
    company: companyWithoutAddress._id,
    payer: { company: companyWithoutAddress._id },
    mainFee: { price: 200, count: 2, description: 'yoyo' },
    billingPurchaseList: [
      { _id: new ObjectId(), billingItem: billingItemList[0]._id, price: 9, count: 1 },
    ],
  },
  { // 6 - payer is other company
    _id: new ObjectId(),
    course: courseList[6]._id,
    company: otherCompany._id,
    payer: { company: authCompany._id },
    mainFee: { price: 200, count: 2, description: 'yoyo' },
    billingPurchaseList: [
      { _id: new ObjectId(), billingItem: billingItemList[0]._id, price: 9, count: 1 },
    ],
    billedAt: '2022-04-07T00:00:00.000Z',
    number: 'FACT-00003',
  },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    Company.create(companyWithoutAddress),
    Course.create(courseList),
    CourseBill.create(courseBillsList),
    CourseBillingItem.create(billingItemList),
    CourseBillsNumber.create(courseBillNumber),
    CourseFundingOrganisation.create(courseFundingOrganisationList),
    Program.create(programList),
    SubProgram.create(subProgramList),
    VendorCompany.create(vendorCompany),
  ]);
};

module.exports = {
  populateDB,
  courseBillsList,
  courseFundingOrganisationList,
  courseList,
  billingItemList,
};
