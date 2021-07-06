const CustomerNote = require('../models/CustomerNote');

exports.createCustomerNote = async (payload, credentials) => CustomerNote
  .create({ ...payload, company: credentials.company._id });

exports.list = async (customer, credentials) => CustomerNote.find({ customer, company: credentials.company._id })
  .sort({ updatedAt: -1 })
  .lean();

exports.update = async (customerNoteId, payload) => CustomerNote.updateOne({ _id: customerNoteId }, { $set: payload });
