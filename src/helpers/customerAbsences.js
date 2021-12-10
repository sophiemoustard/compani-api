const get = require('lodash/get');
const UtilsHelper = require('./utils');
const CustomerAbsence = require('../models/CustomerAbsence');
const EventsHelper = require('./events');

exports.create = async (payload, companyId) => CustomerAbsence.create({ ...payload, company: companyId });

exports.list = async (query, credentials) => CustomerAbsence.find({
  customer: { $in: UtilsHelper.formatIdsArray(query.customer) },
  startDate: { $lte: query.endDate },
  endDate: { $gte: query.startDate },
  company: get(credentials, 'company._id'),
})
  .populate({ path: 'customer', select: 'identity' })
  .lean();

exports.isAbsent = async (customer, date) => !!await CustomerAbsence.countDocuments({
  customer,
  startDate: { $lte: date },
  endDate: { $gte: date },
});

exports.updateCustomerAbsence = async (customerAbsenceId, payload, credentials) => {
  const companyId = get(credentials, 'company._id');
  const customerAbsence = await CustomerAbsence.findOne(
    { _id: customerAbsenceId, company: companyId },
    { customer: 1 }
  ).lean();

  await EventsHelper.deleteCustomerEvents(
    customerAbsence.customer,
    payload.startDate,
    payload.endDate,
    '',
    credentials
  );
  await CustomerAbsence.updateOne({ _id: customerAbsenceId, company: companyId }, { ...payload });
};

exports.updateCustomerAbsencesOnCustomerStop = async (customer, stoppedDate) => {
  await CustomerAbsence.deleteMany({ customer, startDate: { $gte: stoppedDate } });

  await CustomerAbsence.updateMany(
    { customer, startDate: { $lt: stoppedDate }, endDate: { $gt: stoppedDate } },
    { endDate: stoppedDate }
  );
};
