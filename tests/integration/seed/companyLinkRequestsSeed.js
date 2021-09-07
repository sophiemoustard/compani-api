const { ObjectID } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const User = require('../../../src/models/User');
const { authCompany, otherCompany } = require('../../seed/authCompaniesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');
const { MOBILE } = require('../../../src/helpers/constants');
const CompanyLinkRequest = require('../../../src/models/CompanyLinkRequest');

const userWithCompanyLinkRequestList = [
  {
    _id: new ObjectID(),
    identity: { firstname: 'norole', lastname: 'nocompany' },
    refreshToken: uuidv4(),
    local: { email: 'norolenocompany1@alenvi.io', password: 'fdsf5P56D' },
    contact: { phone: '0798640728' },
    origin: MOBILE,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'withoutrole', lastname: 'nocompany' },
    refreshToken: uuidv4(),
    local: { email: 'norolenocompany2@alenvi.io', password: 'fdsf5P56Dt' },
    contact: { phone: '0798640721' },
    origin: MOBILE,
  },
];

const companyLinkRequestList = [
  {
    _id: new ObjectID(),
    user: userWithCompanyLinkRequestList[0]._id,
    company: authCompany._id,
  },
  {
    _id: new ObjectID(),
    user: userWithCompanyLinkRequestList[1]._id,
    company: otherCompany._id,
  },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    User.create(userWithCompanyLinkRequestList),
    CompanyLinkRequest.create(companyLinkRequestList),
  ]);
};

module.exports = { userWithCompanyLinkRequestList, companyLinkRequestList, populateDB };
