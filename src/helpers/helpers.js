const get = require('lodash/get');
const Helper = require('../models/Helper');

exports.list = async (query, credentials) => {
  const helpers = await Helper.find({ customer: query.customer, company: get(credentials, 'company._id') })
    .populate({ path: 'user', select: 'identity local contact' })
    .lean();

  return helpers.map(h => h.user);
};

exports.create = async (userId, customerId, companyId) => {
  await Helper.create({ user: userId, customer: customerId, company: companyId });
};
