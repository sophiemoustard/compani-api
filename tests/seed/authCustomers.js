const { ObjectID } = require('mongodb');
const { authCompany } = require('./authCompaniesSeed');
const { helper } = require('./authUsersSeed');

const authCustomer = {
  _id: new ObjectID(),
  identity: { title: 'mr', lastname: 'lacordée', firstname: 'vian' },
  company: authCompany._id,
  contact: {
    primaryAddress: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
};

const helperCustomer = {
  _id: new ObjectID(),
  user: helper._id,
  customer: authCustomer._id,
  company: authCompany._id,
  referent: true,
};

module.exports = { helperCustomer, authCustomer };
