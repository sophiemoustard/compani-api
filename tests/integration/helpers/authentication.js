const memoize = require('lodash/memoize');
const app = require('../../../server');
const UtilsHelper = require('../../../src/helpers/utils');
const { VENDOR_ROLES } = require('../../../src/helpers/constants');
const { rolesList } = require('../../seed/authRolesSeed');
const { userList, userCompaniesList } = require('../../seed/authUsersSeed');
const { authCompany, companyWithoutSubscription } = require('../../seed/authCompaniesSeed');

const getUser = (roleName, erp = true) => {
  const role = rolesList.find(r => r.name === roleName);

  if (!VENDOR_ROLES.includes(roleName)) {
    const company = [authCompany, companyWithoutSubscription].find(c => c.subscriptions.erp === erp);
    const filteredUserCompanies = userCompaniesList
      .filter(u => UtilsHelper.areObjectIdsEquals(u.company, company._id) && !u.endDate);

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

module.exports = { getToken, getTokenByCredentials };
