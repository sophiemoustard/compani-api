const get = require('lodash/get');
const InternalHour = require('../models/InternalHour');

exports.create = async (payload, credentials) =>
  InternalHour.create({ ...payload, company: get(credentials, 'company._id') });

exports.list = async credentials => InternalHour.find({ company: get(credentials, 'company._id') }).lean();

exports.removeInternalHour = async internalHour => InternalHour.deleteOne({ _id: internalHour._id });
