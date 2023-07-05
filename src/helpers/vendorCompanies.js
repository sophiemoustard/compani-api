const VendorCompany = require('../models/VendorCompany');

exports.get = async () => VendorCompany
  .findOne()
  .populate({ path: 'billingRepresentative', select: '_id picture contact identity local' })
  .lean();

exports.update = async payload => VendorCompany.updateOne({}, { $set: payload });
