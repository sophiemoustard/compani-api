const CustomerPartner = require('../models/CustomerPartner');

exports.createCustomerPartner = async (payload, credentials) => CustomerPartner
  .create({ ...payload, company: credentials.company._id });

exports.list = async (customer, credentials) => CustomerPartner.find({ customer, company: credentials.company._id })
  .populate({ path: 'partner', select: '-__v -createdAt -updatedAt', populate: { path: 'company', select: 'name' } })
  .lean();
