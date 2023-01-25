const { ObjectId } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const User = require('../../../src/models/User');
const { authCompany, otherCompany, companyWithoutSubscription } = require('../../seed/authCompaniesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');
const { MOBILE } = require('../../../src/helpers/constants');
const CompanyLinkRequest = require('../../../src/models/CompanyLinkRequest');
const UserCompany = require('../../../src/models/UserCompany');

const userWithCompanyLinkRequestList = [
  {
    _id: new ObjectId(),
    identity: { firstname: 'norole', lastname: 'nocompany' },
    refreshToken: uuidv4(),
    local: { email: 'norolenocompany1@alenvi.io', password: 'fdsf5P56D' },
    contact: { phone: '0798640728' },
    origin: MOBILE,
  },
  {
    _id: new ObjectId(),
    identity: { firstname: 'withoutrole', lastname: 'nocompany' },
    refreshToken: uuidv4(),
    local: { email: 'norolenocompany2@alenvi.io' },
    contact: { phone: '0798640721' },
    origin: MOBILE,
  },
];

const noRoleNoCompany = {
  _id: new ObjectId(),
  identity: { firstname: 'pasrole', lastname: 'passtructure' },
  refreshToken: uuidv4(),
  local: { email: 'pasrole.passtructure@authuserseed.fr', password: 'fdsf5P56D' },
  contact: { phone: '0798640728' },
  picture: { link: 'qwertyuio', pictureId: 'poiuytrew' },
  origin: MOBILE,
};

const userCompany = {
  _id: new ObjectId(),
  user: noRoleNoCompany._id,
  company: companyWithoutSubscription._id,
  startDate: '2019-01-01T23:00:00.000Z',
  endDate: '2022-11-30T22:59:59.999Z',
};

const companyLinkRequestList = [
  {
    _id: new ObjectId(),
    user: userWithCompanyLinkRequestList[0]._id,
    company: authCompany._id,
  },
  {
    _id: new ObjectId(),
    user: userWithCompanyLinkRequestList[1]._id,
    company: otherCompany._id,
  },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    User.create([...userWithCompanyLinkRequestList, noRoleNoCompany]),
    CompanyLinkRequest.create(companyLinkRequestList),
    UserCompany.create(userCompany),
  ]);
};

module.exports = { userWithCompanyLinkRequestList, companyLinkRequestList, noRoleNoCompany, populateDB };
