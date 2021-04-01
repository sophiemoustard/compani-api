const PartnerOrganization = require('../models/PartnerOrganization');

exports.create = payload => PartnerOrganization.create(payload);
