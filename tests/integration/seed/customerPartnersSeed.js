const { ObjectID } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const Customer = require('../../../src/models/Customer');
const Partner = require('../../../src/models/Partner');
const User = require('../../../src/models/User');
const UserCompany = require('../../../src/models/UserCompany');
const CustomerPartner = require('../../../src/models/CustomerPartner');
const { authCompany, otherCompany } = require('../../seed/authCompaniesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');
const { WEBAPP } = require('../../../src/helpers/constants');
const { auxiliaryRoleId } = require('../../seed/authRolesSeed');

const customersList = [
  {
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
  },
  {
    _id: new ObjectID(),
    company: otherCompany._id,
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
  },
];

const partnersList = [
  {
    _id: new ObjectID(),
    identity: { firstname: 'Anne', lastname: 'Onyme' },
    company: authCompany._id,
    partnerOrganization: new ObjectID(),
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Anne', lastname: 'Onyme' },
    company: otherCompany._id,
    partnerOrganization: new ObjectID(),
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Alain', lastname: 'Terrieur' },
    company: authCompany._id,
    partnerOrganization: new ObjectID(),
  },
];

const customerPartnersList = [
  { _id: new ObjectID(), partner: partnersList[1]._id, customer: customersList[1], company: otherCompany._id },
  { _id: new ObjectID(), partner: partnersList[2]._id, customer: customersList[0], company: authCompany._id },
];

const auxiliaryFromOtherCompany = {
  _id: new ObjectID(),
  identity: { firstname: 'Philou', lastname: 'toto' },
  local: { email: 'othercompanyauxiliary@alenvi.io', password: '123456!eR' },
  role: { client: auxiliaryRoleId },
  refreshToken: uuidv4(),
  origin: WEBAPP,
};

const userCompanies = [{ _id: new ObjectID(), user: auxiliaryFromOtherCompany._id, company: otherCompany._id }];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await User.create(auxiliaryFromOtherCompany);
  await UserCompany.insertMany(userCompanies);
  await Customer.insertMany(customersList);
  await Partner.insertMany(partnersList);
  await CustomerPartner.insertMany(customerPartnersList);
};

module.exports = {
  populateDB,
  customersList,
  partnersList,
  auxiliaryFromOtherCompany,
  customerPartnersList,
};
