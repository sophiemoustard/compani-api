const { ObjectId } = require('mongodb');
const CompanyHolding = require('../../../src/models/CompanyHolding');
const Holding = require('../../../src/models/Holding');
const { deleteNonAuthenticationSeeds } = require('../helpers/db');
const { otherCompany } = require('../../seed/authCompaniesSeed');

const holdings = [
  { _id: new ObjectId(), name: 'Test', address: '37 rue de ponthieu 75008 Paris' },
  { _id: new ObjectId(), name: 'Croix Rouge', address: '24 avenue Daumesnil 75012 Paris' },
];

const companyHolding = { _id: new ObjectId(), company: otherCompany._id, holding: holdings[1]._id };

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    Holding.create(holdings),
    CompanyHolding.create(companyHolding),
  ]);
};

module.exports = { populateDB, holdings };
