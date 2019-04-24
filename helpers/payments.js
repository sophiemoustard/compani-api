const moment = require('moment');
const randomize = require('randomatic');
const { ObjectID } = require('mongodb');

const Payment = require('../models/Payment');
const PaymentNumber = require('../models/PaymentNumber');
const { REFUND, PAYMENT, WITHDRAWAL } = require('./constants');
const {
  createDocument,
  generateSEPAHeader,
  generateSEPAXml,
  generatePaymentInfo,
  addTransactionInfo
} = require('../helpers/xml');
// const { createAndReadFile } = require('../helpers/file');


const generatePaymentNumber = async (paymentNature) => {
  const numberQuery = {};
  switch (paymentNature) {
    case REFUND:
      numberQuery.prefix = `REMB-${moment().format('YYMM')}`;
      break;
    case PAYMENT:
      numberQuery.prefix = `REG-${moment().format('YYMM')}`;
      break;
  }
  return PaymentNumber.findOneAndUpdate(
    numberQuery,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
};

const generateXML = async (firstPayments, recurPayments, company) => {
  const randomId = randomize('0', 31);
  const firstPaymentsTotal = firstPayments.reduce((acc, next) => acc + next.netInclTaxes, 0);
  const recurPaymentsTotal = recurPayments.reduce((acc, next) => acc + next.netInclTaxes, 0);
  const totalPayments = firstPaymentsTotal + recurPaymentsTotal;
  let firstPaymentsInfo = null;
  let recurPaymentsInfo = null;
  const doc = createDocument();
  const header = generateSEPAHeader({
    id: `MSG${randomId}G`,
    created: new Date(),
    initiatorName: company.name.split(' ')[0],
    txNumber: firstPayments.length + recurPayments.length,
    sum: totalPayments,
    ics: company.ics,
  });

  if (firstPayments.length > 0) {
    firstPaymentsInfo = generatePaymentInfo({
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
      }
    });
    firstPaymentsInfo = addTransactionInfo(firstPaymentsInfo, firstPayments);
  }

  if (recurPayments.length > 0) {
    recurPaymentsInfo = generatePaymentInfo({
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
      }
    });
    recurPaymentsInfo = addTransactionInfo(recurPaymentsInfo, recurPayments);
  }

  const outputPath = await generateSEPAXml(doc, header, firstPaymentsInfo, recurPaymentsInfo);
  return outputPath;
};

const formatPayment = async (payment) => {
  const number = await generatePaymentNumber(payment.nature);
  const paymentNumber = `${number.prefix}${number.seq.toString().padStart(3, '0')}`;
  payment.number = paymentNumber;
  payment._id = new ObjectID();
  return payment;
};

const savePayments = async (req) => {
  if (Object.prototype.toString.call(req.payload) === '[object Object]') {
    req.payload = await formatPayment(req.payload);
    const savedPayment = new Payment(req.payload);
    return savedPayment.save();
  }
  if (Array.isArray(req.payload)) {
    const promises = [];
    const firstPayments = [];
    const recurPayments = [];
    for (let payment of req.payload) {
      payment = await formatPayment(payment);
      const countPayments = await Payment.countDocuments({ customer: payment.customer, type: WITHDRAWAL });
      if (countPayments === 0) {
        firstPayments.push(payment);
      } else {
        recurPayments.push(payment);
      }

      const savedPayment = new Payment(payment);
      promises.push(savedPayment.save());
    }

    await Promise.all(promises);
    return generateXML(firstPayments, recurPayments, req.auth.credentials.company);
  }
};

module.exports = { savePayments };
