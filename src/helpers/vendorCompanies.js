const VendorCompany = require('../models/VendorCompany');

exports.get = async () => VendorCompany.findOne().lean();
