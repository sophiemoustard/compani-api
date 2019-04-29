const { ObjectID } = require('mongodb');
const DistanceMatrix = require('../../../models/DistanceMatrix');

const distanceMatrixList = [
  {
    _id: new ObjectID(),
    origin: '42 Rue de la Procession 75015 Paris',
    destination: '37 Rue de Ponthieu 75008 Paris',
    mode: 'transit',
    distance: 5073,
    duration: 1560,
  },
  {
    _id: new ObjectID(),
    origin: '105 BOULEVARD MURAT 75016 PARIS',
    destination: '122 Rue Edouard Vaillant, 92300 Levallois-Perret',
    mode: 'transit',
    distance: 13905,
    duration: 3488,
  },
  {
    _id: new ObjectID(),
    origin: '53 BIS RUE DE BOULAINVILLIERS 75016 PARIS',
    destination: '105 BOULEVARD MURAT 75016 PARIS',
    mode: 'driving',
    distance: 3303,
    duration: 1132,
  },
];

const populateDistanceMatrix = async () => {
  await DistanceMatrix.deleteMany({});
  await DistanceMatrix.insertMany(distanceMatrixList);
};

module.exports = { distanceMatrixList, populateDistanceMatrix };
