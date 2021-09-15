const { ObjectID } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const Company = require('../../../src/models/Company');
const Event = require('../../../src/models/Event');
const User = require('../../../src/models/User');
const UserCompany = require('../../../src/models/UserCompany');
const { authCompany } = require('../../seed/authCompaniesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');
const { clientAdminRoleId } = require('../../seed/authRolesSeed');
const { INTERVENTION, MOBILE } = require('../../../src/helpers/constants');

const company = {
  _id: new ObjectID(),
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
};

const event = {
  startDate: '2019-12-11',
  endDate: '2019-12-11',
  auxiliary: new ObjectID(),
  customer: new ObjectID(),
  subscription: new ObjectID(),
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

const companyClientAdmin = {
  _id: new ObjectID(),
  identity: { firstname: 'client_admin', lastname: 'Chef' },
  refreshToken: uuidv4(),
  local: { email: 'client_admin@alenvi.io', password: '123456!eR' },
  role: { client: clientAdminRoleId },
  origin: MOBILE,
};

const userCompany = { _id: new ObjectID(), user: companyClientAdmin._id, company: company._id };

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    Company.create(company),
    Event.create(event),
    User.create(companyClientAdmin),
    UserCompany.create(userCompany),
  ]);
};

module.exports = { company, companyClientAdmin, populateDB };
