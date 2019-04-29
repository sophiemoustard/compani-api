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


const computePayments = (payments) => {
  if (!payments || !Array.isArray(payments) || payments.length === 0) return 0;
  let total = 0;
  for (const payment of payments) {
    total = computeTotal(payment.nature, total, payment.netInclTaxes);
  }

  return total;
};

const getBalance = (bill, customerAggregation, tppAggregation, payments) => {
  const correspondingCreditNote = !bill._id.tpp
    ? customerAggregation.find(cn => cn._id.customer.toHexString() === bill._id.customer.toHexString() && !cn._id.tpp)
    : tppAggregation.find(cn => cn._id.tpp && cn._id.tpp.toHexString() === bill._id.tpp.toHexString()
      && cn._id.customer.toHexString() === bill._id.customer.toHexString());
  const correspondingPayment = !bill._id.tpp
    ? payments.find(pay => pay._id.customer.toHexString() === bill._id.customer.toHexString() && !pay._id.tpp)
    : payments.find(pay => pay._id.customer.toHexString() === bill._id.customer.toHexString()
      && pay._id.tpp && pay._id.tpp.toHexString() === bill._id.tpp.toHexString());

  bill.billed -= correspondingCreditNote ? correspondingCreditNote.refund : 0;
  bill.paid = correspondingPayment && correspondingPayment.payments ? computePayments(correspondingPayment.payments) : 0;
  bill.balance = bill.paid - bill.billed;
  bill.toPay = canBeWithdrawn(bill) ? Math.abs(bill.balance) : 0;

  return bill;
};

const getBalancesFromCreditNotes = (creditNote, payments) => {
  const correspondingPayment = !creditNote._id.tpp
    ? payments.find(pay => pay._id.customer.toHexString() === creditNote._id.customer.toHexString() && !pay._id.tpp)
    : payments.find(pay => pay._id.customer.toHexString() === creditNote._id.customer.toHexString()
      && pay._id.tpp && pay._id.tpp.toHexString() === creditNote._id.tpp.toHexString());

  const bill = {
    customer: { _id: creditNote.customer },
    billed: -creditNote.refund,
    paid: correspondingPayment && correspondingPayment.payments ? computePayments(correspondingPayment.payments) : 0,
    toPay: 0,
    ...(creditNote.thirdPartyPayer && { thirdPartyPayer: { ...creditNote.thirdPartyPayer } })
  };
  bill.balance = bill.paid - bill.billed;

  return bill;
};

const getBalancesFromPayments = (payment) => {
  const bill = {
    customer: { _id: payment.customer },
    billed: 0,
    paid: payment.payments ? computePayments(payment.payments) : 0,
    toPay: 0,
    ...(payment.thirdPartyPayer && { thirdPartyPayer: { ...payment.thirdPartyPayer } })
  };
  bill.balance = bill.paid - bill.billed;

  return bill;
};

const getBalances = (bills, customerCreditNotesAggregation, tppCreditNotesAggregation, payments) => {
  const balances = [];
  const clients = [];
  for (const bill of bills) {
    clients.push({ ...bill._id });
    balances.push(getBalance(bill, customerCreditNotesAggregation, tppCreditNotesAggregation, payments));
  }

  const remainingCreditNotes = [...customerCreditNotesAggregation, ...tppCreditNotesAggregation]
    .filter(cn => !clients.some(cl => cl.customer.toHexString() === cn._id.customer.toHexString()
      && ((!cl.tpp && !cn._id.tpp) || (cl.tpp && cn._id.tpp && cl.tpp.toHexString() === cn._id.tpp.toHexString()))));

  for (const cn of remainingCreditNotes) {
    clients.push({ ...cn._id });
    balances.push(getBalancesFromCreditNotes(cn, payments));
  }

  const remainingPayments = payments
    .filter(payment => !clients.some(cl => cl.customer.toHexString() === payment._id.customer.toHexString()
      && ((!cl.tpp && !payment._id.tpp) || (cl.tpp && payment._id.tpp && cl.tpp.toHexString() === payment._id.tpp.toHexString()))));
  for (const cn of remainingPayments) {
    balances.push(getBalancesFromPayments(cn, payments));
  }

  return balances;
};

module.exports = {
  computeTotal,
  canBeWithdrawn,
  computePayments,
  getBalance,
  getBalances,
};
