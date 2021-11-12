const get = require('lodash/get');
const CustomerAbsence = require('../models/CustomerAbsence');

exports.create = async (payload, companyId) => CustomerAbsence.create({ ...payload, company: companyId });

exports.list = async (query, credentials) => CustomerAbsence.find({
  customer: { $in: query.customer },
  startDate: { $gte: query.startDate },
  endDate: { $lte: query.endDate },
  company: get(credentials, 'company._id'),
})
  .populate({ path: 'customer', select: 'contact identity' })
  .lean();

exports.isAbsent = async (customer, date) => !!await CustomerAbsence.countDocuments({
  customer,
  startDate: { $lte: date },
  endDate: { $gte: date },
});
