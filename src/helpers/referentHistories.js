const get = require('lodash/get');
const moment = require('../extensions/moment');
const Customer = require('../models/Customer');
const ReferentHistory = require('../models/ReferentHistory');

exports.updateCustomerReferent = async (customerId, referent, company) => {
  const [lastHistory] = await ReferentHistory.find({ customer: customerId, company: company._id })
    .sort({ startDate: -1 })
    .limit(1)
    .lean();

  const lastHistoryEndsBeforeYesterday = get(lastHistory, 'endDate') &&
    moment(lastHistory.endDate).isBefore(moment().subtract(1, 'd').endOf('d'));
  if (!lastHistory || lastHistoryEndsBeforeYesterday) {
    if (!referent) return null;
    return exports.createReferentHistory(customerId, referent, company);
  }

  const lastHistoryEndsYesterday = lastHistory.endDate &&
    moment().subtract(1, 'd').endOf('d').isSame(lastHistory.endDate);
  if (lastHistoryEndsYesterday) {
    if (!referent) return null;

    const isSameReferent = referent === lastHistory.auxiliary._id.toHexString();
    if (isSameReferent) return exports.updateLastHistory(lastHistory, { $unset: { endDate: '' } });

    return exports.createReferentHistory(customerId, referent, company);
  }

  const customer = await Customer.findOne({ _id: customerId })
    .populate({ path: 'firstIntervention', select: 'startDate', match: { company: company._id } })
    .lean();

  if (!referent) {
    const lastHistoryStartsOnSameDay = moment().startOf('d').isSame(lastHistory.startDate);
    if (lastHistoryStartsOnSameDay || !customer.firstIntervention) {
      return ReferentHistory.deleteOne({ _id: lastHistory._id });
    }

    return exports.updateLastHistory(lastHistory, { endDate: moment().subtract(1, 'd').endOf('d').toDate() });
  }

  if (referent === lastHistory.auxiliary._id.toHexString()) return null;

  if (!customer.firstIntervention) {
    return exports.updateLastHistory(lastHistory, { startDate: moment().startOf('d').toDate(), auxiliary: referent });
  }

  const lastHistoryStartsOnSameDay = moment().startOf('d').isSame(lastHistory.startDate);
  if (lastHistoryStartsOnSameDay) return exports.updateLastHistory(lastHistory, { auxiliary: referent });

  await exports.updateLastHistory(lastHistory, { endDate: moment().subtract(1, 'd').endOf('d').toDate() });
  return exports.createReferentHistory(customerId, referent, company);
};

exports.updateLastHistory = async (history, payload) => ReferentHistory.updateOne({ _id: history._id }, payload);

exports.createReferentHistory = async (customerId, referent, company) => ReferentHistory.create({
  customer: customerId,
  auxiliary: referent,
  startDate: moment().startOf('d').toDate(),
  company: company._id,
});
