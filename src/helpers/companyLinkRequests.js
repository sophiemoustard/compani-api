const CompanyLinkRequest = require('../models/CompanyLinkRequest');

exports.create = async (payload, credentials) => CompanyLinkRequest
  .create({ user: credentials._id, company: payload.company });
