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

  return customerPartners;
};

exports.update = async (customerPartnerId, payload) => {
  const customerPartner = await CustomerPartner
    .findOneAndUpdate({ _id: customerPartnerId }, { $set: payload }, { projection: { customer: 1 } })
    .lean();

  if (payload.prescriber) {
    await CustomerPartner.updateOne(
      { _id: { $ne: customerPartnerId }, customer: customerPartner.customer, prescriber: true },
      { $set: { prescriber: false } }
    );
  }
};

exports.remove = async customerPartnerId => CustomerPartner.deleteOne({ _id: customerPartnerId });
