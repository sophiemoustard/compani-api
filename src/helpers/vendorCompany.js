const has = require('lodash/has');
const VendorCompany = require('../models/VendorCompany');

exports.get = async credentials => VendorCompany
  .findOne()
  .setOptions({ isVendorUser: has(credentials, 'role.vendor') })
  .lean();
