const PartnerOrganization = require('../models/PartnerOrganization');
const Partner = require('../models/Partner');

exports.create = (payload, credentials) => PartnerOrganization.create({ ...payload, company: credentials.company._id });

exports.list = credentials => PartnerOrganization.find({ company: credentials.company._id }).lean();

exports.getPartnerOrganization = (partnerOrganizationId, credentials) => PartnerOrganization
  .findOne({ _id: partnerOrganizationId, company: credentials.company._id })
  .populate({
    path: 'partners',
    select: 'identity phone email job',
    populate: {
      path: 'customerPartners',
      match: { prescriber: true, company: credentials.company._id },
      populate: { path: 'customer', select: 'identity subscriptions createdAt' },
    },
  })
  .lean();

exports.update = async (partnerOrganizationId, payload) => PartnerOrganization
  .updateOne({ _id: partnerOrganizationId }, { $set: payload });

exports.createPartner = async (partnerOrganizationId, payload, credentials) => {
  const partner = await Partner.create({
    ...payload,
    partnerOrganization: partnerOrganizationId,
    company: credentials.company._id,
  });

  return PartnerOrganization.updateOne({ _id: partnerOrganizationId }, { $push: { partners: partner._id } });
};
