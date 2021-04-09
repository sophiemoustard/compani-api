const PartnerOrganization = require('../models/PartnerOrganization');

exports.create = (payload, credentials) => PartnerOrganization.create({ ...payload, company: credentials.company._id });

exports.list = credentials => PartnerOrganization.find({ company: credentials.company._id }).lean();

exports.getById = partnerOrganizationId => PartnerOrganization.findOne({ _id: partnerOrganizationId })
  .lean();

exports.update = async (partnerOrganizationId, payload) => PartnerOrganization
  .updateOne({ _id: partnerOrganizationId }, { $set: payload });
