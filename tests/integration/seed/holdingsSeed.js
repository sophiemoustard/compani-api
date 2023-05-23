const { ObjectId } = require('mongodb');
const Holding = require('../../../src/models/Holding');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');

const holding = {
  _id: new ObjectId(),
  name: 'Test',
  address: {
    fullAddress: '37 rue de ponthieu 75008 Paris',
    zipCode: '75008',
    city: 'Paris',
    street: '37 rue de Ponthieu',
    location: { type: 'Point', coordinates: [2.377133, 48.801389] },
  },
};

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    Holding.create(holding),
  ]);
};

module.exports = { populateDB };
