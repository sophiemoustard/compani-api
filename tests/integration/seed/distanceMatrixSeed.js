const { ObjectID } = require('mongodb');
const DistanceMatrix = require('../../../src/models/DistanceMatrix');
const { populateDBForAuthentication, authCompany } = require('./authenticationSeed');

const distanceMatrixList = [
  {
    _id: new ObjectID(),
    company: authCompany._id,
    origins: '42 Rue de la Procession 75015 Paris',
    destinations: '37 Rue de Ponthieu 75008 Paris',
    mode: 'transit',
    distance: 5073,
    duration: 1560,
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    origins: '105 BOULEVARD MURAT 75016 PARIS',
    destinations: '122 Rue Edouard Vaillant, 92300 Levallois-Perret',
    mode: 'transit',
    distance: 13905,
    duration: 3488,
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    origins: '53 BIS RUE DE BOULAINVILLIERS 75016 PARIS',
    destinations: '105 BOULEVARD MURAT 75016 PARIS',
    mode: 'driving',
    distance: 3303,
    duration: 1132,
  },
];

const populateDB = async () => {
  await DistanceMatrix.deleteMany({});

  await populateDBForAuthentication();
  await DistanceMatrix.insertMany(distanceMatrixList);
};

module.exports = { distanceMatrixList, populateDB };
