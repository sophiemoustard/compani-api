const CustomerPartner = require('../models/CustomerPartner');

exports.createCustomerPartner = async (payload, credentials) => {
  const { company } = credentials;
  const customerPartner = { ...payload, company: company._id };

  await CustomerPartner.create(customerPartner);
};

exports.list = async customer => CustomerPartner.find({ customer })
  .populate({ path: 'partner', select: '-__v -createdAt -updatedAt' })
  .lean();
