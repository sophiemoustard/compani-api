const { ObjectId } = require('mongodb');
const Holding = require('../../../src/models/Holding');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');

const holding = { _id: new ObjectId(), name: 'Test', address: '37 rue de ponthieu 75008 Paris' };

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    Holding.create(holding),
  ]);
};

module.exports = { populateDB };
