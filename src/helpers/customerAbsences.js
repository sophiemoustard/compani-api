const CustomerAbsence = require('../models/CustomerAbsence');

exports.create = async (payload, companyId) => CustomerAbsence.create({ ...payload, company: companyId });

exports.isAbsent = (customer, date) => CustomerAbsence.countDocuments({
  customer,
  startDate: { $lte: date },
  endDate: { $gte: date },
});
