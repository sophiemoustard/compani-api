const { ObjectID } = require('mongodb');
const Establishment = require('../../../src/models/Establishment');
const { populateDBForAuthentication, authCompany } = require('./authenticationSeed');


const establishmentsList = [
  {
    _id: new ObjectID(),
    name: 'Toto',
    siret: '12345678901234',
    address: {
      street: '15, rue du test',
      fullAddress: '15, rue du test 75007 Paris',
      zipCode: '75007',
      city: 'Paris',
      location: {
        type: 'Point',
        coordinates: [4.849302, 2.90887],
      },
    },
    phone: '0123456789',
    workHealthService: 'MT01',
    urssafCode: '117',
    company: authCompany,
  },
  {
    _id: new ObjectID(),
    name: 'Tata',
    siret: '09876543210987',
    address: {
      street: '37, rue des acacias',
      fullAddress: '37, rue des acacias 69000 Lyon',
      zipCode: '69000',
      city: 'Lyon',
      location: {
        type: 'Point',
        coordinates: [4.824302, 3.50807],
      },
    },
    phone: '0446899034',
    workHealthService: 'MT01',
    urssafCode: '207',
    company: authCompany,
  },
];

const populateDB = async () => {
  await Establishment.deleteMany();

  await populateDBForAuthentication();

  await Establishment.insertMany(establishmentsList);
};

module.exports = { populateDB, establishmentsList };
