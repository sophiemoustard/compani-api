const PartnerOrganization = require('../models/PartnerOrganization');

exports.create = (payload, credentials) => PartnerOrganization.create({ ...payload, company: credentials.company._id });
