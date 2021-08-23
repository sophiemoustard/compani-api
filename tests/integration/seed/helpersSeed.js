const { v4: uuidv4 } = require('uuid');
const { ObjectID } = require('mongodb');
const User = require('../../../src/models/User');
const Customer = require('../../../src/models/Customer');
const Helper = require('../../../src/models/Helper');
const { rolesList, otherCompany, authCompany } = require('./authenticationSeed');
const { deleteNonAuthenticationSeeds } = require('./initializeDB');
const { WEBAPP } = require('../../../src/helpers/constants');
const UserCompany = require('../../../src/models/UserCompany');

const customer = {
  _id: new ObjectID(),
  company: authCompany._id,
  identity: { title: 'mr', firstname: 'Romain', lastname: 'Bardet' },
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

const customerFromOtherCompany = {
  _id: new ObjectID(),
  identity: { title: 'mr', firstname: 'toto', lastname: 'test' },
  company: otherCompany._id,
  contact: {
    primaryAddress: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
    phone: '0123456789',
    accessCodes: 'porte c3po',
  },
};

const helperFromOtherCompany = {
  _id: new ObjectID(),
  identity: { firstname: 'Guigui', lastname: 'toto' },
  local: { email: 'othercompany@alenvi.io', password: '123456!eR' },
  role: { client: rolesList.find(role => role.name === 'helper')._id },
  refreshToken: uuidv4(),
  inactivityDate: null,
  origin: WEBAPP,
};

const usersSeedList = [{
  _id: new ObjectID(),
  identity: { firstname: 'Helper1', lastname: 'Carolyn' },
  local: { email: 'carolyn@alenvi.io', password: '123456!eR' },
  refreshToken: uuidv4(),
  role: { client: rolesList.find(role => role.name === 'helper')._id },
  origin: WEBAPP,
}];

const userCompanies = [
  { _id: new ObjectID(), user: helperFromOtherCompany._id, company: otherCompany._id },
  { _id: new ObjectID(), user: usersSeedList[0]._id, company: authCompany._id },
];

const helpersList = [
  {
    _id: new ObjectID(),
    user: usersSeedList[0]._id,
    customer: customer._id,
    company: authCompany._id,
    referent: false,
  },
  {
    _id: new ObjectID(),
    user: helperFromOtherCompany._id,
    customer: customerFromOtherCompany._id,
    company: otherCompany._id,
    referent: true,
  },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await User.create([...usersSeedList, helperFromOtherCompany]);
  await Customer.create([customerFromOtherCompany, customer]);
  await Helper.create(helpersList);
  await UserCompany.insertMany(userCompanies);
};

module.exports = {
  usersSeedList,
  populateDB,
  customer,
  customerFromOtherCompany,
  helperFromOtherCompany,
  helpersList,
};
