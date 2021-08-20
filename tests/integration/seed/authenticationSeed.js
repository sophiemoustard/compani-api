const { ObjectID } = require('mongodb');
const memoize = require('lodash/memoize');
const Role = require('../../../src/models/Role');
const User = require('../../../src/models/User');
const Company = require('../../../src/models/Company');
const Sector = require('../../../src/models/Sector');
const SectorHistory = require('../../../src/models/SectorHistory');
const UserCompany = require('../../../src/models/UserCompany');
const UtilsHelper = require('../../../src/helpers/utils');
const { rolesList } = require('../../seed/roleSeed');
const { userList, userCompaniesList } = require('../../seed/userSeed');
const { authCompany, companyWithoutSubscription } = require('../../seed/companySeed');
const app = require('../../../server');
const { VENDOR_ROLES } = require('../../../src/helpers/constants');

const otherCompany = {
  _id: new ObjectID(),
  prefixNumber: 102,
  name: 'Other test SAS',
  tradeName: 'Othertest',
  folderId: '0987654321',
  directDebitsFolderId: '1234567890',
  customersFolderId: 'mnbvcxz',
  auxiliariesFolderId: 'iuytre',
  subscriptions: { erp: true },
};

const sector = { _id: new ObjectID(), name: 'Test', company: authCompany._id };

const sectorHistories = [
  {
    _id: new ObjectID(),
    auxiliary: userList[2]._id,
    sector: sector._id,
    company: authCompany._id,
    startDate: '2020-12-10',
  },
  { _id: new ObjectID(),
    auxiliary: userList[4]._id,
    sector: sector._id,
    company: authCompany._id,
    startDate: '2018-12-10' },
];

const populateDBForAuthentication = async () => {
  await Promise.all([
    Role.deleteMany(),
    User.deleteMany(),
    Company.deleteMany(),
    Sector.deleteMany(),
    SectorHistory.deleteMany(),
    UserCompany.deleteMany(),
  ]);

  await Promise.all([
    Company.create([authCompany, otherCompany, companyWithoutSubscription]),
    Sector.create(sector),
    SectorHistory.insertMany(sectorHistories),
    Role.insertMany(rolesList),
    UserCompany.insertMany(userCompaniesList),
  ]);
  for (const user of userList) {
    await User.create(user);
  }
};

const getUser = (roleName, erp = true) => {
  const role = rolesList.find(r => r.name === roleName);

  if (!VENDOR_ROLES.includes(roleName)) {
    const company = [authCompany, companyWithoutSubscription].find(c => c.subscriptions.erp === erp);
    const filteredUserCompanies = userCompaniesList.filter(u => UtilsHelper.areObjectIdsEquals(u.company, company._id));

    return userList.find(u => UtilsHelper.areObjectIdsEquals(u.role[role.interface], role._id) &&
      filteredUserCompanies.some(uc => UtilsHelper.areObjectIdsEquals(uc.user, u._id)));
  }

  return userList.find(u => UtilsHelper.areObjectIdsEquals(u.role[role.interface], role._id));
};

const getTokenByCredentials = memoize(
  async (credentials) => {
    const response = await app.inject({
      method: 'POST',
      url: '/users/authenticate',
      payload: credentials,
    });

    return response.result.data.token;
  },
  // do not stringify the 'credentials' object, because the order of the props can't be predicted
  credentials => JSON.stringify([credentials.email, credentials.password])
);

const getToken = async (roleName, erp) => {
  const user = getUser(roleName, erp);
  return getTokenByCredentials(user.local);
};

module.exports = {
  rolesList,
  userList,
  populateDBForAuthentication,
  getUser,
  getToken,
  getTokenByCredentials,
  authCompany,
  otherCompany,
  sector,
  sectorHistories,
};
