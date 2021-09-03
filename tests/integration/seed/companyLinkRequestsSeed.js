const { ObjectID } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const User = require('../../../src/models/User');
const { authCompany } = require('../../seed/authCompaniesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');
const { MOBILE } = require('../../../src/helpers/constants');
const CompanyLinkRequest = require('../../../src/models/CompanyLinkRequest');

const userWithCompanyLinkRequest = {
  _id: new ObjectID(),
  identity: { firstname: 'norole', lastname: 'nocompany' },
  refreshToken: uuidv4(),
  local: { email: 'norolenocompany@alenvi.io', password: 'fdsf5P56D' },
  contact: { phone: '0798640728' },
  origin: MOBILE,
};

const companyLinkRequest = { _id: new ObjectID(), user: userWithCompanyLinkRequest._id, company: authCompany._id };

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    User.create(userWithCompanyLinkRequest),
    CompanyLinkRequest.create(companyLinkRequest),
  ]);
};

module.exports = { userWithCompanyLinkRequest, populateDB };
