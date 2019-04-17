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


const computePayments = (payments, ids) => {
  if (!payments || !Array.isArray(payments) || payments.length === 0) return 0;
  let total = 0;
  for (const payment of payments) {
    if (ids.tpp && payment.client && ids.tpp.toHexString() === payment.client.toHexString() && ids.customer.toHexString() === payment.customer.toHexString()) {
      total = computeTotal(payment.nature, total, payment.netInclTaxes);
    } else if (!ids.tpp && !payment.client && ids.customer.toHexString() === payment.customer.toHexString()) {
      total = computeTotal(payment.nature, total, payment.netInclTaxes);
    }
  }
  return total;
};

module.exports = {
  canBeWithdrawn,
  computePayments,
};
