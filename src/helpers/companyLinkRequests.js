const CompanyLinkRequest = require('../models/CompanyLinkRequest');

exports.create = async (payload, credentials) => CompanyLinkRequest
  .create({ user: credentials._id, company: payload.company });

exports.list = async credentials => CompanyLinkRequest.find({ company: credentials.company._id })
  .populate({ path: 'user', select: 'identity.lastname identity.firstname local.email picture' })
  .lean();

exports.removeCompanyLinkRequest = async id => CompanyLinkRequest.deleteOne({ _id: id });
