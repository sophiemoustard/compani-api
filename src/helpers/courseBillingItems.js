const CourseBillingItem = require('../models/CourseBillingItem');

exports.list = async () => CourseBillingItem.find().lean();

exports.create = async payload => CourseBillingItem.create(payload);
