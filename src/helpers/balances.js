const get = require('lodash/get');
const { getLastVersion } = require('./utils');
const { PAYMENT } = require('./constants');
const BillRepository = require('../repositories/BillRepository');
const CreditNoteRepository = require('../repositories/CreditNoteRepository');
const PaymentRepository = require('../repositories/PaymentRepository');

exports.canBeDirectDebited = (bill) => {
  if (!bill) throw new Error('Bill must be provided');
  return !!(
    bill.balance < 0 &&
    !bill._id.tpp &&
    bill.customer.payment &&
    bill.customer.payment.bankAccountOwner &&
    bill.customer.payment.bic &&
    bill.customer.payment.iban &&
    bill.customer.payment.mandates &&
    bill.customer.payment.mandates.length > 0 &&
    getLastVersion(bill.customer.payment.mandates, 'createdAt').signedAt
  );
};

exports.computeTotal = (nature, total, netInclTaxes) => {
  if (nature === PAYMENT) return total + netInclTaxes;
  return total - netInclTaxes;
};


exports.computePayments = (payments) => {
  if (!payments || !Array.isArray(payments) || payments.length === 0) return 0;
  let total = 0;
  for (const payment of payments) {
    total = exports.computeTotal(payment.nature, total, payment.netInclTaxes);
  }

  return total;
};

exports.getBalance = (bill, customerAggregation, tppAggregation, payments) => {
  const correspondingCreditNote = !bill._id.tpp
    ? customerAggregation.find(cn => cn._id.customer.toHexString() === bill._id.customer.toHexString() && !cn._id.tpp)
    : tppAggregation.find(cn => cn._id.tpp && cn._id.tpp.toHexString() === bill._id.tpp.toHexString()
      && cn._id.customer.toHexString() === bill._id.customer.toHexString());
  const correspondingPayment = !bill._id.tpp
    ? payments.find(pay => pay._id.customer.toHexString() === bill._id.customer.toHexString() && !pay._id.tpp)
    : payments.find(pay => pay._id.customer.toHexString() === bill._id.customer.toHexString()
      && pay._id.tpp && pay._id.tpp.toHexString() === bill._id.tpp.toHexString());

  bill.billed -= correspondingCreditNote ? correspondingCreditNote.refund : 0;
  bill.paid = correspondingPayment && correspondingPayment.payments ? exports.computePayments(correspondingPayment.payments) : 0;
  bill.balance = bill.paid - bill.billed;
  bill.toPay = exports.canBeDirectDebited(bill) ? Math.abs(bill.balance) : 0;

  return bill;
};

exports.getBalancesFromCreditNotes = (creditNote, payments) => {
  const correspondingPayment = !creditNote._id.tpp
    ? payments.find(pay => pay._id.customer.toHexString() === creditNote._id.customer.toHexString() && !pay._id.tpp)
    : payments.find(pay => pay._id.customer.toHexString() === creditNote._id.customer.toHexString()
      && pay._id.tpp && pay._id.tpp.toHexString() === creditNote._id.tpp.toHexString());

  const bill = {
    customer: creditNote.customer,
    billed: -creditNote.refund,
    paid: correspondingPayment && correspondingPayment.payments ? exports.computePayments(correspondingPayment.payments) : 0,
    toPay: 0,
    ...(creditNote.thirdPartyPayer && { thirdPartyPayer: { ...creditNote.thirdPartyPayer } }),
  };
  bill.balance = bill.paid - bill.billed;

  return bill;
};

exports.getBalancesFromPayments = (payment) => {
  const bill = {
    customer: payment.customer,
    billed: 0,
    paid: payment.payments ? exports.computePayments(payment.payments) : 0,
    toPay: 0,
    ...(payment.thirdPartyPayer && { thirdPartyPayer: { ...payment.thirdPartyPayer } }),
  };
  bill.balance = bill.paid - bill.billed;

  return bill;
};

exports.getBalances = async (customerId, maxDate, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const bills = await BillRepository.findAmountsGroupedByClient(customerId, maxDate, companyId);
  const customerCreditNotesAggregation = await CreditNoteRepository.findAmountsGroupedByCustomer(customerId, maxDate);
  const tppCreditNotesAggregation = await CreditNoteRepository.findAmountsGroupedByTpp(customerId, maxDate);
  const payments = await PaymentRepository.findAmountsGroupedByClient(customerId, maxDate, companyId);

  const balances = [];
  const clients = [];
  for (const bill of bills) {
    clients.push({ ...bill._id });
    balances.push(exports.getBalance(bill, customerCreditNotesAggregation, tppCreditNotesAggregation, payments));
  }

  const remainingCreditNotes = [...customerCreditNotesAggregation, ...tppCreditNotesAggregation]
    .filter(cn => !clients.some(cl => cl.customer.toHexString() === cn._id.customer.toHexString()
      && ((!cl.tpp && !cn._id.tpp) || (cl.tpp && cn._id.tpp && cl.tpp.toHexString() === cn._id.tpp.toHexString()))));

  for (const cn of remainingCreditNotes) {
    clients.push({ ...cn._id });
    balances.push(exports.getBalancesFromCreditNotes(cn, payments));
  }

  const remainingPayments = payments
    .filter(payment => !clients.some(cl => cl.customer.toHexString() === payment._id.customer.toHexString()
      && ((!cl.tpp && !payment._id.tpp) || (cl.tpp && payment._id.tpp && cl.tpp.toHexString() === payment._id.tpp.toHexString()))));
  for (const cn of remainingPayments) {
    balances.push(exports.getBalancesFromPayments(cn, payments));
  }

  return balances;
};
