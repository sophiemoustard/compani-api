const { ObjectId } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const Company = require('../../../src/models/Company');
const Event = require('../../../src/models/Event');
const User = require('../../../src/models/User');
const UserCompany = require('../../../src/models/UserCompany');
const { authCompany, companyWithoutSubscription, otherCompany } = require('../../seed/authCompaniesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/db');
const { clientAdminRoleId } = require('../../seed/authRolesSeed');
const { INTERVENTION, MOBILE, WEBAPP, COMPANY } = require('../../../src/helpers/constants');

const company = {
  _id: new ObjectId(),
  rcs: '1234567890',
  siren: '1234567890',
  name: 'Test',
  tradeName: 'TT',
  rhConfig: { phoneFeeAmount: 12 },
  iban: 'FR3514508000505917721779B12',
  bic: 'RTYUIKJHBFRG',
  ics: '12345678',
  folderId: '0987654321',
  directDebitsFolderId: '1234567890',
  customersConfig: { billingPeriod: 'two_weeks' },
  customersFolderId: 'mnbvcxz',
  auxiliariesFolderId: 'kjhgf',
  prefixNumber: 104,
  type: COMPANY,
};

const event = {
  startDate: '2019-12-11',
  endDate: '2019-12-11',
  auxiliary: new ObjectId(),
  customer: new ObjectId(),
  subscription: new ObjectId(),
  type: INTERVENTION,
  company: authCompany._id,
  address: {
    fullAddress: '37 rue de ponthieu 75008 Paris',
    zipCode: '75008',
    city: 'Paris',
    street: '37 rue de Ponthieu',
    location: { type: 'Point', coordinates: [2.377133, 48.801389] },
  },
};

const usersList = [
  {
    _id: new ObjectId(),
    identity: { firstname: 'client_admin', lastname: 'Chef' },
    refreshToken: uuidv4(),
    local: { email: 'client_admin@alenvi.io', password: '123456!eR' },
    role: { client: clientAdminRoleId },
    origin: MOBILE,
  },
  {
    _id: new ObjectId(),
    identity: { firstname: 'Futur', lastname: 'Chargé de factu' },
    local: { email: 'sfjgp@tt.com', password: '123456!eR' },
    refreshToken: uuidv4(),
    role: { client: clientAdminRoleId },
    origin: WEBAPP,
  },
];

const userCompanies = [
  // old inactive user company
  {
    _id: new ObjectId(),
    user: usersList[0]._id,
    company: companyWithoutSubscription._id,
    startDate: '2022-01-01T23:00:00.000Z',
    endDate: '2022-11-30T23:00:00.000Z',
  },
  { _id: new ObjectId(), user: usersList[0]._id, company: company._id },
  { _id: new ObjectId(), user: usersList[1]._id, company: otherCompany._id },
];
const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    Company.create(company),
    Event.create(event),
    User.create(usersList),
    UserCompany.create(userCompanies),
  ]);
};

module.exports = { company, usersList, populateDB };
