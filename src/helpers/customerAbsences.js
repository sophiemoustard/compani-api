const get = require('lodash/get');
const UtilsHelper = require('./utils');
const CustomerAbsence = require('../models/CustomerAbsence');

exports.create = async (payload, companyId) => CustomerAbsence.create({ ...payload, company: companyId });

exports.list = async (query, credentials) => CustomerAbsence.find({
  customer: { $in: UtilsHelper.formatIdsArray(query.customer) },
  startDate: { $lte: query.endDate },
  endDate: { $gte: query.startDate },
  company: get(credentials, 'company._id'),
})
  .populate({ path: 'customer', select: 'identity' })
  .lean();

exports.isAbsent = async (customer, date) => !!await CustomerAbsence.countDocuments({
  customer,
  startDate: { $lte: date },
  endDate: { $gte: date },
});
