const BillingItem = require('../models/BillingItem');

exports.create = async (payload, credentials) => BillingItem.create({ ...payload, company: credentials.company._id });
