const { ObjectId } = require('mongodb');
const Company = require('../../../src/models/Company');
const Holding = require('../../../src/models/Holding');
const { deleteNonAuthenticationSeeds } = require('../helpers/db');

const holdings = [
  { _id: new ObjectId(), name: 'Test', address: '37 rue de ponthieu 75008 Paris' },
];

const company = {
  _id: new ObjectId(),
  name: 'Company',
  tradeName: 'comp',
  prefixNumber: 107,
  iban: '1234',
  bic: '5678',
  ics: '9876',
  folderId: '1234567890',
  directDebitsFolderId: '1234567890',
  customersFolderId: 'qwerty',
  auxiliariesFolderId: 'asdfgh',
  customersConfig: { billingPeriod: 'two_weeks' },
  subscriptions: { erp: false },
};

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    Company.create(company),
    Holding.create(holdings),
  ]);
};

module.exports = { populateDB, holdings, company };
