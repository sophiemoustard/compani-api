const moment = require('moment');
const get = require('lodash/get');
const randomize = require('randomatic');
const { ObjectID } = require('mongodb');
const Boom = require('boom');

const Payment = require('../models/Payment');
const PaymentNumber = require('../models/PaymentNumber');
const {
  REFUND,
  PAYMENT,
  DIRECT_DEBIT,
  PAYMENT_TYPES_LIST,
  PAYMENT_NATURE_LIST,
  CIVILITY_LIST,
} = require('./constants');
const XmlHelper = require('../helpers/xml');
const UtilsHelper = require('./utils');

exports.getPayments = async (payload, credentials) => {
  const { startDate, endDate, ...query } = payload;
  query.company = get(credentials, 'company._id', null);
  if (startDate || endDate) {
    query.date = UtilsHelper.getDateQuery({ startDate, endDate });
  }

  return Payment.find(query)
    .populate({ path: 'client', select: '_id name' })
    .populate({ path: 'customer', select: '_id identity' })
    .lean();
};

exports.getPaymentNumber = async (payment, companyId) => PaymentNumber.findOneAndUpdate(
  { nature: payment.nature, company: companyId, prefix: moment(payment.date).format('MMYY') },
  {},
  { new: true, upsert: true, setDefaultsOnInsert: true }
).lean();

exports.formatPaymentNumber = (companyPrefixNumber, prefix, seq, paymentNature) => {
  switch (paymentNature) {
    case REFUND:
      return `REMB-${companyPrefixNumber}${prefix}${seq.toString().padStart(5, '0')}`;
    case PAYMENT:
      return `REG-${companyPrefixNumber}${prefix}${seq.toString().padStart(5, '0')}`;
  }
};

exports.generateXML = async (firstPayments, recurPayments, company) => {
  const randomId = randomize('0', 31);
  const firstPaymentsTotal = firstPayments.reduce((acc, next) => acc + next.netInclTaxes, 0);
  const recurPaymentsTotal = recurPayments.reduce((acc, next) => acc + next.netInclTaxes, 0);
  const totalPayments = firstPaymentsTotal + recurPaymentsTotal;
  let firstPaymentsInfo = null;
  let recurPaymentsInfo = null;
  const doc = XmlHelper.createDocument();
  const header = XmlHelper.generateSEPAHeader({
    id: `MSG${randomId}G`,
    created: new Date(),
    initiatorName: company.name.split(' ')[0],
    txNumber: firstPayments.length + recurPayments.length,
    sum: totalPayments,
    ics: company.ics,
  });

  if (firstPayments.length > 0) {
    firstPaymentsInfo = XmlHelper.generatePaymentInfo({
      id: `MSG${randomId}F`,
      sequenceType: 'FRST',
      method: 'DD',
      txNumber: firstPayments.length,
      sum: firstPaymentsTotal,
      collectionDate: new Date(),
      creditor: {
        name: company.name.split(' ')[0],
        iban: company.iban,
        bic: company.bic,
        ics: company.ics,
      },
    });
    firstPaymentsInfo = XmlHelper.addTransactionInfo(firstPaymentsInfo, firstPayments);
  }

  if (recurPayments.length > 0) {
    recurPaymentsInfo = XmlHelper.generatePaymentInfo({
      id: `MSG${randomId}R`,
      sequenceType: 'RCUR',
      method: 'DD',
      txNumber: recurPayments.length,
      sum: recurPaymentsTotal,
      collectionDate: new Date(),
      creditor: {
        name: company.name.split(' ')[0],
        iban: company.iban,
        bic: company.bic,
        ics: company.ics,
      },
    });
    recurPaymentsInfo = XmlHelper.addTransactionInfo(recurPaymentsInfo, recurPayments);
  }

  const outputPath = await XmlHelper.generateSEPAXml(
    doc,
    header,
    company.directDebitsFolderId,
    firstPaymentsInfo,
    recurPaymentsInfo
  );
  return outputPath;
};

exports.createPayment = async (payload, credentials) => {
  const { company } = credentials;
  const number = await exports.getPaymentNumber(payload, company._id);
  const payment = await Payment.create(exports.formatPayment(payload, company, number));
  number.seq += 1;
  await PaymentNumber.updateOne(
    { prefix: number.prefix, nature: payload.nature, company: company._id },
    { $set: { seq: number.seq } }
  );
  return payment;
};

exports.formatPayment = (payment, company, number) => ({
  date: new Date(),
  ...payment,
  _id: new ObjectID(),
  number: exports.formatPaymentNumber(company.prefixNumber, number.prefix, number.seq, payment.nature),
  company: company._id,
});

exports.savePayments = async (payload, credentials) => {
  const { company } = credentials;
  if (!company || !company.name || !company.iban || !company.bic || !company.ics || !company.directDebitsFolderId) {
    throw Boom.badRequest('Missing mandatory company info !');
  }

  const allPayments = [];
  const firstPayments = [];
  const recurPayments = [];
  const paymentNumber = await exports.getPaymentNumber({ nature: PAYMENT }, company._id);
  const refundNumber = await exports.getPaymentNumber({ nature: REFUND }, company._id);
  for (const payment of payload) {
    const number = payment.nature === PAYMENT ? paymentNumber : refundNumber;
    const newPayment = await exports.formatPayment(payment, company, number);
    const count = await Payment.countDocuments({
      customer: newPayment.customer,
      type: DIRECT_DEBIT,
      rum: newPayment.rum,
      company: company._id,
    });
    if (count === 0) firstPayments.push(newPayment);
    else recurPayments.push(newPayment);

    allPayments.push(newPayment);
    if (newPayment.nature === PAYMENT) paymentNumber.seq += 1;
    else refundNumber.seq += 1;
  }
  await Payment.insertMany(allPayments);
  await PaymentNumber.updateOne(
    { prefix: paymentNumber.prefix, nature: PAYMENT, company: company._id },
    { $set: { seq: paymentNumber.seq } }
  );
  await PaymentNumber.updateOne(
    { prefix: refundNumber.prefix, nature: REFUND, company: company._id },
    { $set: { seq: refundNumber.seq } }
  );
  return exports.generateXML(firstPayments, recurPayments, company);
};

const paymentExportHeader = [
  'Nature',
  'Identifiant',
  'Date',
  'Id Bénéficiaire',
  'Titre',
  'Nom',
  'Prénom',
  'Id tiers payeur',
  'Tiers payeur',
  'Moyen de paiement',
  'Montant TTC en €',
];

exports.exportPaymentsHistory = async (startDate, endDate, credentials) => {
  const query = {
    date: { $lte: endDate, $gte: startDate },
    company: get(credentials, 'company._id'),
  };

  const payments = await Payment.find(query)
    .sort({ date: 'desc' })
    .populate({ path: 'customer', select: 'identity' })
    .populate({ path: 'client' })
    .lean();

  const rows = [paymentExportHeader];

  for (const payment of payments) {
    const customerId = get(payment.customer, '_id');
    const clientId = get(payment.client, '_id');
    const cells = [
      PAYMENT_NATURE_LIST[payment.nature],
      payment.number || '',
      moment(payment.date).format('DD/MM/YYYY'),
      customerId ? customerId.toHexString() : '',
      CIVILITY_LIST[get(payment, 'customer.identity.title')] || '',
      get(payment, 'customer.identity.lastname', '').toUpperCase(),
      get(payment, 'customer.identity.firstname', ''),
      clientId ? clientId.toHexString() : '',
      get(payment.client, 'name') || '',
      PAYMENT_TYPES_LIST[payment.type] || '',
      UtilsHelper.formatFloatForExport(payment.netInclTaxes),
    ];

    rows.push(cells);
  }

  return rows;
};
