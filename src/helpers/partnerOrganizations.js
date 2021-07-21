const PartnerOrganization = require('../models/PartnerOrganization');
const Partner = require('../models/Partner');

exports.create = (payload, credentials) => PartnerOrganization.create({ ...payload, company: credentials.company._id });

const populatePrescribedCustomersCount = partnerOrganizationList => partnerOrganizationList
  .map(partnerOrganization => (
    {
      ...partnerOrganization,
      prescribedCustomersCount: partnerOrganization.partners
        .reduce((acc, val) => acc + val.customerPartners.length, 0),
    }
  ));

exports.list = async (credentials) => {
  const partnerOrganizationList = await PartnerOrganization
    .find({ company: credentials.company._id })
    .populate({
      path: 'partners',
      match: { company: credentials.company._id },
      populate: { path: 'customerPartners', match: { prescriber: true, company: credentials.company._id } },
    })
    .lean();

  return populatePrescribedCustomersCount(partnerOrganizationList);
};

exports.getPartnerOrganization = (partnerOrganizationId, credentials) => PartnerOrganization
  .findOne({ _id: partnerOrganizationId, company: credentials.company._id })
  .populate({
    path: 'partners',
    match: { company: credentials.company._id },
    select: 'identity phone email job',
    populate: {
      path: 'customerPartners',
      match: { prescriber: true, company: credentials.company._id },
      populate: { path: 'customer', select: 'identity createdAt' },
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
