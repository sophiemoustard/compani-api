const Partner = require('../models/Partner');

exports.list = credentials => Partner.find({ company: credentials.company._id }).lean();
