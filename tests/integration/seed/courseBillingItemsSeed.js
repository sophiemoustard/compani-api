const { ObjectId } = require('mongodb');
const CourseBillingItem = require('../../../src/models/CourseBillingItem');
const { deleteNonAuthenticationSeeds } = require('../helpers/db');

const courseBillingItemsList = [{ _id: new ObjectId(), name: 'frais formateur' }];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([CourseBillingItem.create(courseBillingItemsList)]);
};

module.exports = {
  populateDB,
  courseBillingItemsList,
};
