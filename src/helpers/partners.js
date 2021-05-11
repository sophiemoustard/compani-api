const Partner = require('../models/Partner');

exports.list = async credentials => Partner.find({ company: credentials.company._id }).lean();
