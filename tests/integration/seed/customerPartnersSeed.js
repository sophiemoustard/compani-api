const { ObjectId } = require('mongodb');
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
  },
  {
    _id: new ObjectId(),
    company: otherCompany._id,
    identity: { title: 'mr', firstname: 'Julian', lastname: 'Alaphilippe' },
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
    _id: new ObjectId(),
    identity: { firstname: 'Anne', lastname: 'Onyme' },
    company: authCompany._id,
    partnerOrganization: new ObjectId(),
  },
  {
    _id: new ObjectId(),
    identity: { firstname: 'Anne', lastname: 'Onyme' },
    company: otherCompany._id,
    partnerOrganization: new ObjectId(),
  },
  {
    _id: new ObjectId(),
    identity: { firstname: 'Alain', lastname: 'Terrieur' },
    company: authCompany._id,
    partnerOrganization: new ObjectId(),
  },
  {
    _id: new ObjectId(),
    identity: { firstname: 'Alex', lastname: 'Terrieur' },
    company: authCompany._id,
    partnerOrganization: new ObjectId(),
  },
];

const customerPartnersList = [
  { _id: new ObjectId(), partner: partnersList[1]._id, customer: customersList[1], company: otherCompany._id },
  { _id: new ObjectId(), partner: partnersList[2]._id, customer: customersList[0], company: authCompany._id },
  {
    _id: new ObjectId(),
    partner: partnersList[3]._id,
    customer: customersList[0],
    company: authCompany._id,
    prescriber: true,
  },
];

const auxiliaryFromOtherCompany = {
  _id: new ObjectId(),
  identity: { firstname: 'Philou', lastname: 'toto' },
  local: { email: 'othercompanyauxiliary@alenvi.io', password: '123456!eR' },
  role: { client: auxiliaryRoleId },
  refreshToken: uuidv4(),
  origin: WEBAPP,
};

const userCompanies = [
  // old inactive user company
  {
    _id: new ObjectId(),
    user: auxiliaryFromOtherCompany._id,
    company: authCompany._id,
    startDate: '2022-01-01T23:00:00.000Z',
    endDate: '2022-11-30T23:00:00.000Z',
  },
  { _id: new ObjectId(), user: auxiliaryFromOtherCompany._id, company: otherCompany._id },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    Customer.create(customersList),
    CustomerPartner.create(customerPartnersList),
    Partner.create(partnersList),
    User.create(auxiliaryFromOtherCompany),
    UserCompany.create(userCompanies),
  ]);
};

module.exports = {
  populateDB,
  customersList,
  partnersList,
  auxiliaryFromOtherCompany,
  customerPartnersList,
};
