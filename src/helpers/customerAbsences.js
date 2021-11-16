const get = require('lodash/get');
const moment = require('moment');
const UtilsHelper = require('./utils');
const CustomerAbsence = require('../models/CustomerAbsence');

exports.create = async (payload, companyId) => CustomerAbsence.create({
  ...payload,
  endDate: moment(payload.endDate).subtract(1, 'm').add(1, 'd'),
  company: companyId,
});

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
