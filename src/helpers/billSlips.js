const moment = require('moment');
const get = require('lodash/get');
const pick = require('lodash/pick');
const path = require('path');
const BillSlip = require('../models/BillSlip');
const BillSlipNumber = require('../models/BillSlipNumber');
const BillRepository = require('../repositories/BillRepository');
const CreditNoteRepository = require('../repositories/CreditNoteRepository');
const DocxHelper = require('./docx');
const UtilsHelper = require('./utils');
const NumbersHelper = require('./numbers');
const { MONTHLY } = require('./constants');

exports.getBillSlips = async (credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const billSlipList = await BillRepository.getBillsSlipList(companyId);
  const creditNoteList = await CreditNoteRepository.getCreditNoteList(companyId);

  for (const billSlip of billSlipList) {
    const billSlipMonth = billSlip.month;
    const creditNote = creditNoteList.find(cn => cn.month === billSlipMonth &&
      UtilsHelper.areObjectIdsEquals(cn.thirdPartyPayer._id, billSlip.thirdPartyPayer._id));
    if (!creditNote) continue;
    billSlip.netInclTaxes = NumbersHelper.subtract(billSlip.netInclTaxes, creditNote.netInclTaxes);
  }

  for (const creditNote of creditNoteList) {
    const creditNoteMonth = creditNote.month;
    const bill = billSlipList.find(bs => creditNoteMonth === bs.month &&
      UtilsHelper.areObjectIdsEquals(creditNote.thirdPartyPayer._id, bs.thirdPartyPayer._id));
    if (bill) continue;
    billSlipList.push({ ...creditNote, netInclTaxes: -creditNote.netInclTaxes });
  }

  return billSlipList.map(bs => ({ ...bs, netInclTaxes: NumbersHelper.toFixedToFloat(bs.netInclTaxes) }));
};

exports.formatBillSlipNumber = (companyPrefixNumber, prefix, seq) =>
  `BORD-${companyPrefixNumber}${prefix}${seq.toString().padStart(5, '0')}`;

exports.getBillSlipNumber = async (endDate, companyId) => {
  const prefix = moment(endDate).format('MMYY');

  return BillSlipNumber
    .findOneAndUpdate({ prefix, company: companyId }, {}, { new: true, upsert: true, setDefaultsOnInsert: true })
    .lean();
};

exports.createBillSlips = async (billList, endDate, company) => {
  const month = moment(endDate).format('MM-YYYY');
  const prefix = moment(endDate).format('MMYY');
  const tppIds = [...new Set(billList.filter(bill => bill.thirdPartyPayer).map(bill => bill.thirdPartyPayer))];
  const billSlipList = await BillSlip.find({ thirdPartyPayer: { $in: tppIds }, month, company: company._id }).lean();

  if (tppIds.length === billSlipList.length) return;

  const slipNumber = await exports.getBillSlipNumber(endDate, company._id);
  const list = [];
  let { seq } = slipNumber;
  for (const tpp of tppIds) {
    if (!tpp || billSlipList.some(bs => UtilsHelper.areObjectIdsEquals(bs.thirdPartyPayer, tpp))) continue;
    const number = exports.formatBillSlipNumber(company.prefixNumber, slipNumber.prefix, seq);
    list.push({ company: company._id, month, thirdPartyPayer: tpp, number });
    seq += 1;
  }

  await Promise.all([
    BillSlip.insertMany(list),
    BillSlipNumber.updateOne({ prefix, company: company._id }, { $set: { seq } }),
  ]);
};

exports.formatFundingInfo = (info, billingDoc) => {
  const matchingFunding = info.customer.fundings
    .find(f => UtilsHelper.areObjectIdsEquals(f._id, billingDoc.fundingId));
  if (!matchingFunding || matchingFunding.frequency !== MONTHLY) return null;

  const matchingVersion = UtilsHelper.mergeLastVersionWithBaseObject(matchingFunding, 'createdAt');
  if (!matchingVersion) return null;

  const tppParticipationRate = NumbersHelper.toFixedToFloat(
    NumbersHelper.divide(NumbersHelper.subtract(100, matchingVersion.customerParticipationRate), 100),
    4
  );

  const customerParticipationRate = NumbersHelper.toFixedToFloat(
    NumbersHelper.divide(matchingVersion.customerParticipationRate, 100),
    4
  );

  return {
    number: info.number || '',
    createdAt: info.createdAt,
    date: moment(info.date).format('DD/MM/YYYY'),
    customer: get(info, 'customer.identity.lastname'),
    folderNumber: matchingVersion.folderNumber || '',
    tppParticipationRate: UtilsHelper.formatPercentage(tppParticipationRate),
    customerParticipationRate: UtilsHelper.formatPercentage(customerParticipationRate),
    careHours: UtilsHelper.formatHour(matchingVersion.careHours),
    unitTTCRate: UtilsHelper.formatPrice(matchingVersion.unitTTCRate),
    billedCareHours: 0,
    netInclTaxes: 0,
  };
};

exports.formatBillingDataForFile = (billList, creditNoteList) => {
  let billsAndCreditNotes = [];
  for (const bill of billList) {
    for (const subscription of bill.subscriptions) {
      const billingData = {};
      for (const event of subscription.events) {
        if (!billingData[event.fundingId]) {
          const formattedInfo = exports.formatFundingInfo(bill, event);
          if (formattedInfo) billingData[event.fundingId] = formattedInfo;
        }
        billingData[event.fundingId].billedCareHours =
          NumbersHelper.add(billingData[event.fundingId].billedCareHours, event.careHours);
        billingData[event.fundingId].netInclTaxes =
          NumbersHelper.add(billingData[event.fundingId].netInclTaxes, event.inclTaxesTpp);
        if (subscription.discount) billingData[event.fundingId].discount = subscription.discount;
      }
      billsAndCreditNotes = billsAndCreditNotes.concat(Object.values(billingData));
    }
  }

  for (const creditNote of creditNoteList) {
    const billingData = {};
    for (const event of creditNote.events) {
      if (!billingData[event.bills.fundingId]) {
        const formattedInfo = exports.formatFundingInfo(creditNote, event.bills);
        if (formattedInfo) billingData[event.bills.fundingId] = formattedInfo;
      }
      billingData[event.bills.fundingId].billedCareHours =
        NumbersHelper.add(billingData[event.bills.fundingId].billedCareHours, event.bills.careHours);
      billingData[event.bills.fundingId].netInclTaxes =
        NumbersHelper.subtract(billingData[event.bills.fundingId].netInclTaxes, event.bills.inclTaxesTpp);
    }
    billsAndCreditNotes = billsAndCreditNotes.concat(Object.values(billingData));
  }

  let total = NumbersHelper.toString(0);
  const formattedBills = [];
  for (const bill of billsAndCreditNotes) {
    const netInclTaxes = bill.discount ? NumbersHelper.subtract(bill.netInclTaxes, bill.discount) : bill.netInclTaxes;
    total = NumbersHelper.add(total, NumbersHelper.toFixedToFloat(netInclTaxes));
    formattedBills.push({
      ...bill,
      netInclTaxes: UtilsHelper.formatPrice(NumbersHelper.toFixedToFloat(netInclTaxes)),
      billedCareHours: UtilsHelper.formatHour(NumbersHelper.toFixedToFloat(bill.billedCareHours)),
    });
  }

  formattedBills.sort((a, b) => {
    if (a.customer > b.customer) return 1;
    if (a.customer < b.customer) return -1;
    return moment(a.createdAt).isBefore(b.createdAt) ? -1 : 1;
  });

  return { total: UtilsHelper.formatPrice(NumbersHelper.toFixedToFloat(total)), formattedBills };
};

exports.formatFile = (billSlip, billList, creditNoteList, company) => {
  const { total, formattedBills } = exports.formatBillingDataForFile(billList, creditNoteList);

  return {
    billSlip: {
      ...pick(billSlip, ['number', 'thirdPartyPayer']),
      date: moment().format('DD/MM/YYYY'),
      company: {
        ...pick(company, ['iban', 'bic', 'rcs', 'logo']),
        address: get(company, 'address.fullAddress') || '',
        email: company.billingAssistance || '',
        website: 'www.alenvi.io',
      },
      period: {
        start: moment(billSlip.month, 'MM-YYYY').startOf('M').format('DD/MM/YYYY'),
        end: moment(billSlip.month, 'MM-YYYY').endOf('M').format('DD/MM/YYYY'),
      },
      formattedBills,
      total,
    },
  };
};

exports.generateFile = async (billSlipId, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const billSlip = await BillSlip.findById(billSlipId).populate('thirdPartyPayer').lean();
  const billList = await BillRepository.getBillsFromBillSlip(billSlip, companyId);
  const creditNoteList = await CreditNoteRepository.getCreditNoteFromBillSlip(billSlip, companyId);

  const data = exports.formatFile(billSlip, billList, creditNoteList, credentials.company);

  const file = await DocxHelper.createDocx(path.join(__dirname, '../data/billSlip.docx'), data);

  return { billSlipNumber: billSlip.number, file };
};
