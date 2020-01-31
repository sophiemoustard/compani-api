const moment = require('moment');
const Company = require('../models/Company');
const User = require('../models/User');
const Role = require('../models/Role');
const Contract = require('../models/Contract');
const { AUXILIARY_WITHOUT_COMPANY } = require('../helpers/constants');
const EmailHelper = require('../helpers/email');

const updateRole = {
  async method() {
    let error;
    let updatedUserCount = 0;
    try {
      const companies = await Company.find({}).lean();
      const role = await Role.findOne({ name: AUXILIARY_WITHOUT_COMPANY }).lean();
      for (const company of companies) {
        const contracts = await Contract.find({
          company: company._id,
          endDate: moment().subtract(1, 'day').endOf('day').toDate(),
        }).lean();
        const usersToUpdate = contracts.map(contract => contract.user);
        const updatedUser = await User.updateMany({ _id: { $in: usersToUpdate } }, { $set: { role: role._id } });
        updatedUserCount += updatedUser.nModified;
      }
    } catch (e) {
      error = e.message;
    }
    return { results: updatedUserCount, error };
  },

  async onComplete(server, { results, error }) {
    try {
      server.log(['cron'], 'update role OK');
      if (error) server.log(['error', 'cron', 'oncomplete'], error);
      server.log(['cron', 'oncomplete'], `${results} role updated.`);
      EmailHelper.completeRoleUpdateScriptEmail(results);
    } catch (e) {
      server.log(['error', 'cron', 'oncomplete'], e);
    }
  },
};

module.exports = updateRole;
