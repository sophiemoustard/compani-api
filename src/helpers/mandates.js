const flat = require('flat');
const Customer = require('../models/Customer');

exports.getMandates = async customerId => Customer.findOne(
  { _id: customerId, 'payment.mandates': { $exists: true } },
  { identity: 1, 'payment.mandates': 1 },
  { autopopulate: false }
).lean();

exports.updateMandate = async (customerId, mandateId, payload) => Customer.findOneAndUpdate(
  { _id: customerId, 'payment.mandates._id': mandateId },
  { $set: flat({ 'payment.mandates.$': { ...payload } }) },
  { new: true, select: { identity: 1, 'payment.mandates': 1 }, autopopulate: false }
).lean();
