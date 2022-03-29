const VendorCompany = require('../models/VendorCompany');

exports.get = async () => VendorCompany.findOne().lean();

exports.update = async payload => VendorCompany.updateOne({}, { $set: payload });
