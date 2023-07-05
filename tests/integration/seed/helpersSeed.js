const { v4: uuidv4 } = require('uuid');
const { ObjectId } = require('mongodb');
const User = require('../../../src/models/User');
const Customer = require('../../../src/models/Customer');
const Helper = require('../../../src/models/Helper');
const { otherCompany, authCompany, companyWithoutSubscription } = require('../../seed/authCompaniesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/db');
const { WEBAPP } = require('../../../src/helpers/constants');
const UserCompany = require('../../../src/models/UserCompany');
const { helperRoleId } = require('../../seed/authRolesSeed');

const customer = {
  _id: new ObjectId(),
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
  _id: new ObjectId(),
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
  _id: new ObjectId(),
  identity: { firstname: 'Guigui', lastname: 'toto' },
  local: { email: 'othercompany@alenvi.io' },
  role: { client: helperRoleId },
  refreshToken: uuidv4(),
  inactivityDate: null,
  origin: WEBAPP,
};

const usersSeedList = [{
  _id: new ObjectId(),
  identity: { firstname: 'Helper1', lastname: 'Carolyn' },
  local: { email: 'carolyn@alenvi.io' },
  refreshToken: uuidv4(),
  role: { client: helperRoleId },
  origin: WEBAPP,
}];

const userCompanies = [
  // old inactive user company
  {
    _id: new ObjectId(),
    user: helperFromOtherCompany._id,
    company: companyWithoutSubscription._id,
    startDate: '2022-01-01T23:00:00.000Z',
    endDate: '2022-11-30T23:00:00.000Z',
  },
  { _id: new ObjectId(), user: helperFromOtherCompany._id, company: otherCompany._id },
  { _id: new ObjectId(), user: usersSeedList[0]._id, company: authCompany._id },
];

const helpersList = [
  {
    _id: new ObjectId(),
    user: usersSeedList[0]._id,
    customer: customer._id,
    company: authCompany._id,
    referent: false,
  },
  {
    _id: new ObjectId(),
    user: helperFromOtherCompany._id,
    customer: customerFromOtherCompany._id,
    company: otherCompany._id,
    referent: true,
  },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    User.create([...usersSeedList, helperFromOtherCompany]),
    Customer.create([customerFromOtherCompany, customer]),
    Helper.create(helpersList),
    UserCompany.create(userCompanies),
  ]);
};

module.exports = {
  populateDB,
  customer,
  customerFromOtherCompany,
  helpersList,
};
