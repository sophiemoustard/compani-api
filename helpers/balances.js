const { getLastVersion } = require('./utils');

const canBeWithdrawn = (bill) => {
  if (!bill) throw new Error('Bill must be provided');
  return bill.balance < 0 && !bill._id.tpp && bill.customer.payment && bill.customer.payment.mandates.length > 0 && getLastVersion(bill.customer.mandates).signedAt;
};

module.exports = {
  canBeWithdrawn
};
