const CustomerPartner = require('../models/CustomerPartner');

exports.createCustomerPartner = async (payload, credentials) => CustomerPartner
  .create({ ...payload, company: credentials.company._id });

exports.list = async (customer, credentials) => {
  const customerPartners = await CustomerPartner.find({ customer, company: credentials.company._id })
    .populate({
      path: 'partner',
      select: '-__v -createdAt -updatedAt',
      populate: { path: 'partnerOrganization', select: 'name' },
    })
    .lean();

  return customerPartners.map(customerPartner => customerPartner.partner);
};
