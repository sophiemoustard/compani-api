const get = require('lodash/get');
const { getLastVersion } = require('./utils');
const { PAYMENT, CESU } = require('./constants');
const BillRepository = require('../repositories/BillRepository');
const CreditNoteRepository = require('../repositories/CreditNoteRepository');
const PaymentRepository = require('../repositories/PaymentRepository');
const BillHelper = require('./bills');
const CreditNoteHelper = require('./creditNotes');
const PaymentHelper = require('./payments');
const UtilsHelper = require('./utils');
const ThirdPartyPayer = require('../models/ThirdPartyPayer');

exports.canBeDirectDebited = (bill) => {
  if (!bill) throw new Error('Bill must be provided');

  return !!(
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

exports.formatParticipationRate = (balanceDocument, tppList) => {
  const isTppBalance = !!balanceDocument.thirdPartyPayer;
  if (isTppBalance) return 0;

  const fundings = get(balanceDocument, 'customer.fundings') || null;
  if (!fundings) return 100;

  const sortedFundings = fundings
    .filter(fund => tppList.some(tpp => UtilsHelper.areObjectIdsEquals(tpp._id, fund.thirdPartyPayer) && tpp.isApa))
    .map(fund => UtilsHelper.mergeLastVersionWithBaseObject(fund, 'createdAt'))
    .sort((a, b) => b.customerParticipationRate - a.customerParticipationRate);

  return sortedFundings.length ? sortedFundings[0].customerParticipationRate : 100;
};

const getCustomerMatchingInfo = (bill, info) => UtilsHelper.areObjectIdsEquals(info._id.customer, bill._id.customer) &&
  !info._id.tpp;

const getCustomerAndTppMatchingInfo = (bill, info) => info._id.tpp &&
  UtilsHelper.areObjectIdsEquals(info._id.tpp, bill._id.tpp) &&
  UtilsHelper.areObjectIdsEquals(info._id.customer, bill._id.customer);

exports.getBalance = (bill, customerAggregation, tppAggregation, payments, tppList) => {
  const matchingCreditNote = !bill._id.tpp
    ? customerAggregation.find(cn => getCustomerMatchingInfo(bill, cn))
    : tppAggregation.find(cn => getCustomerAndTppMatchingInfo(bill, cn));
  const matchingPayment = !bill._id.tpp
    ? payments.find(pay => getCustomerMatchingInfo(bill, pay))
    : payments.find(pay => getCustomerAndTppMatchingInfo(bill, pay));

  const paid = matchingPayment && matchingPayment.payments
    ? exports.computePayments(matchingPayment.payments)
    : 0;
  const billed = bill.billed - (matchingCreditNote ? matchingCreditNote.refund : 0);
  const balance = paid - billed;

  const lastCesuPayment = matchingPayment && matchingPayment.payments.filter(p => p.type === CESU)
    .sort((a, b) => b.date - a.date)[0];

  return {
    ...bill,
    participationRate: exports.formatParticipationRate(bill, tppList),
    billed,
    paid,
    balance,
    toPay: exports.canBeDirectDebited(bill) && balance < 0 ? Math.abs(paid - billed) : 0,
    lastCesuPaymentDate: get(lastCesuPayment, 'date', null),
  };
};

exports.getBalancesFromCreditNotes = (creditNote, payments, tppList) => {
  const matchingPayment = !creditNote._id.tpp
    ? payments.find(pay => UtilsHelper.areObjectIdsEquals(pay._id.customer, creditNote._id.customer) && !pay._id.tpp)
    : payments.find(pay => UtilsHelper.areObjectIdsEquals(pay._id.customer, creditNote._id.customer) &&
      pay._id.tpp && UtilsHelper.areObjectIdsEquals(pay._id.tpp, creditNote._id.tpp));

  const bill = {
    customer: creditNote.customer,
    participationRate: exports.formatParticipationRate(creditNote, tppList),
    billed: -creditNote.refund,
    paid: matchingPayment && matchingPayment.payments
      ? exports.computePayments(matchingPayment.payments)
      : 0,
    toPay: 0,
  };
  if (creditNote.thirdPartyPayer) bill.thirdPartyPayer = { ...creditNote.thirdPartyPayer };
  bill.balance = bill.paid - bill.billed;

  return bill;
};

exports.getBalancesFromPayments = (payment, tppList) => {
  const bill = {
    customer: payment.customer,
    billed: 0,
    paid: payment.payments ? exports.computePayments(payment.payments) : 0,
    toPay: 0,
    participationRate: exports.formatParticipationRate(payment, tppList),
  };
  if (payment.thirdPartyPayer) bill.thirdPartyPayer = { ...payment.thirdPartyPayer };
  bill.balance = bill.paid - bill.billed;

  return bill;
};

exports.getBalances = async (credentials, customerId = null, maxDate = null) => {
  const companyId = get(credentials, 'company._id', null);
  const bills = await BillRepository.findAmountsGroupedByClient(companyId, customerId, maxDate);
  const customerCNAggregation = await CreditNoteRepository.findAmountsGroupedByCustomer(companyId, customerId, maxDate);
  const tppCNAggregation = await CreditNoteRepository.findAmountsGroupedByTpp(companyId, customerId, maxDate);
  const payments = await PaymentRepository.findAmountsGroupedByClient(companyId, customerId, maxDate);
  const tppList = await ThirdPartyPayer.find({ company: companyId }).lean();

  const balances = [];
  const clients = [];
  for (const bill of bills) {
    clients.push({ ...bill._id });
    balances.push(exports.getBalance(bill, customerCNAggregation, tppCNAggregation, payments, tppList));
  }

  const remainingCreditNotes = [...customerCNAggregation, ...tppCNAggregation].filter(cn => !clients.some((cl) => {
    const isCustomerCreditNote = UtilsHelper.areObjectIdsEquals(cl.customer, cn._id.customer);
    const noTpp = !cl.tpp && !cn._id.tpp;
    const isClientCreditNote = cl.tpp && cn._id.tpp && UtilsHelper.areObjectIdsEquals(cl.tpp, cn._id.tpp);

    return isCustomerCreditNote && (noTpp || isClientCreditNote);
  }));

  for (const cn of remainingCreditNotes) {
    clients.push({ ...cn._id });
    balances.push(exports.getBalancesFromCreditNotes(cn, payments, tppList));
  }

  const remainingPayments = payments.filter(payment => !clients.some((cl) => {
    const isCustomerPayment = UtilsHelper.areObjectIdsEquals(cl.customer, payment._id.customer);
    const noTpp = !cl.tpp && !payment._id.tpp;
    const isTppPayment = cl.tpp && payment._id.tpp && UtilsHelper.areObjectIdsEquals(cl.tpp, payment._id.tpp);

    return isCustomerPayment && (noTpp || isTppPayment);
  }));

  for (const payment of remainingPayments) {
    balances.push(exports.getBalancesFromPayments(payment, tppList));
  }

  return balances;
};

exports.getBalancesWithDetails = async (query, credentials) => {
  const [balances, bills, payments, creditNotes] = await Promise.all([
    exports.getBalances(credentials, query.customer, query.startDate),
    BillHelper.getBills(query, credentials),
    PaymentHelper.getPayments(query, credentials),
    CreditNoteHelper.getCreditNotes(query, credentials),
  ]);

  return { balances, bills, payments, creditNotes };
};
