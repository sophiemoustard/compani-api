const BillingItem = require('../models/BillingItem');

exports.create = async (payload, credentials) => BillingItem.create({ ...payload, company: credentials.company._id });

exports.list = async (credentials, query) => BillingItem.find({ ...query, company: credentials.company._id });

exports.remove = async id => BillingItem.deleteOne({ _id: id });
