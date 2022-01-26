const { ObjectId } = require('mongodb');
const CourseFundingOrganisation = require('../../../src/models/CourseFundingOrganisation');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');

const courseFundingOrganisationsList = [
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
    name: 'APA Gironde',
    address: {
      street: '30 cours de la Marne',
      zipCode: '33000',
      city: 'Bordeaux',
      fullAddress: '30 cours de la Marne 33000 Bordeaux',
      location: { type: 'Point', coordinates: [2.0987, 1.2345] },
    },
  },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([CourseFundingOrganisation.create(courseFundingOrganisationsList)]);
};

module.exports = {
  populateDB,
  courseFundingOrganisationsList,
};
