const get = require('lodash/get');
const Helper = require('../models/Helper');

exports.list = async (query, credentials) => {
  const helpers = await Helper.find({ customer: query.customer, company: get(credentials, 'company._id') })
    .populate({ path: 'user', select: 'identity local contact createdAt' })
    .lean();

  return helpers.map(h => ({ ...h.user, helperId: h._id, isReferent: h.referent }));
};

exports.update = async (helperId, payload) => {
  await Helper.updateOne({ _id: helperId }, { $set: payload });
};

exports.create = async (userId, customerId, companyId) =>
  Helper.create({ user: userId, customer: customerId, company: companyId });

exports.remove = async userId => Helper.deleteMany({ user: userId });
