const { ObjectId } = require('mongodb');
const { INTRA } = require('../../../src/helpers/constants');
const Course = require('../../../src/models/Course');
const CourseBill = require('../../../src/models/CourseBill');
const CourseBillingItem = require('../../../src/models/CourseBillingItem');
const CourseFundingOrganisation = require('../../../src/models/CourseFundingOrganisation');
const { authCompany, otherCompany } = require('../../seed/authCompaniesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');

const courseList = [
  {
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
  {
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
  {
    _id: new ObjectId(),
    type: INTRA,
    company: otherCompany._id,
    subProgram: new ObjectId(),
    misc: 'group 3',
    trainer: new ObjectId(),
    salesRepresentative: new ObjectId(),
    contact: new ObjectId(),
    trainees: [new ObjectId()],

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
];

const courseBillsList = [
  {
    _id: new ObjectId(),
    course: courseList[0]._id,
    company: authCompany._id,
    mainFee: { price: 120, count: 1 },
    billingItemList: [
      { _id: new ObjectId(), billingItem: billingItemList[0]._id, price: 90, count: 1 },
      { _id: new ObjectId(), billingItem: billingItemList[1]._id, price: 400, count: 1 },
    ],
  },
  {
    _id: new ObjectId(),
    course: courseList[1]._id,
    company: authCompany._id,
    mainFee: { price: 120, count: 1, description: 'Lorem ipsum' },
    courseFundingOrganisation: courseFundingOrganisationList[0]._id,
  },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    Course.create(courseList),
    CourseFundingOrganisation.create(courseFundingOrganisationList),
    CourseBill.create(courseBillsList),
    CourseBillingItem.create(billingItemList),
  ]);
};

module.exports = {
  populateDB,
  courseBillsList,
  courseFundingOrganisationList,
  courseList,
  billingItemList,
};
