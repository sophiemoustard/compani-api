const { getLastVersion } = require('./utils');
const { PAYMENT } = require('./constants');

const canBeWithdrawn = (bill) => {
  if (!bill) throw new Error('Bill must be provided');
  return !!(
    bill.balance < 0 &&
    !bill._id.tpp &&
    bill.customer.payment &&
    bill.customer.payment.mandates.length > 0 &&
    getLastVersion(bill.customer.payment.mandates, 'createdAt').signedAt
  );
};

const computeTotal = (nature, total, netInclTaxes) => {
  if (nature === PAYMENT) return total + netInclTaxes;
  return total - netInclTaxes;
};

const reducePayments = ids => (total, next) => {
  if (ids.tpp && next.client && ids.tpp.toHexString() === next.client.toHexString() && ids.customer.toHexString() === next.customer.toHexString()) {
    return computeTotal(next.nature, total, next.netInclTaxes);
  } else if (!ids.tpp && !next.client && ids.customer.toHexString() === next.customer.toHexString()) {
    return computeTotal(next.nature, total, next.netInclTaxes);
  }
  return total;
};

const computePayments = (payments, ids) => {
  if (!payments || !Array.isArray(payments) || payments.length === 0) throw new Error('Invalid payments array !');
  return payments.reduce(reducePayments(ids), 0);
};

module.exports = {
  canBeWithdrawn,
  computePayments,
};
