const { ObjectId } = require('mongodb');
const CourseBill = require('../../../src/models/CourseBill');
const CourseFundingOrganisation = require('../../../src/models/CourseFundingOrganisation');
const { deleteNonAuthenticationSeeds } = require('../helpers/db');

const courseFundingOrganisationsList = [
  { _id: new ObjectId(), name: 'APA Paris', address: '1 avenue Denfert Rochereau 75014 Paris' },
  { _id: new ObjectId(), name: 'APA Gironde', address: '30 cours de la Marne 33000 Bordeaux' },
];

const courseBills = [
  {
    _id: new ObjectId(),
    course: new ObjectId(),
    mainFee: { price: 1000, count: 1 },
    company: new ObjectId(),
    payer: { fundingOrganisation: courseFundingOrganisationsList[1]._id },
    billingPurchaseList: [],
  },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    CourseFundingOrganisation.create(courseFundingOrganisationsList),
    CourseBill.create(courseBills),
  ]);
};

module.exports = {
  populateDB,
  courseFundingOrganisationsList,
};
