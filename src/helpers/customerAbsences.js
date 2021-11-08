const CustomerAbsence = require('../models/CustomerAbsence');

exports.create = async (payload, credentials) => CustomerAbsence
  .create({ ...payload, company: credentials.company._id });
