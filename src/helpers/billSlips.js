const moment = require('moment');
const get = require('lodash/get');
const BillSlip = require('../models/BillSlip');
const BillSlipNumber = require('../models/BillSlipNumber');
const BillRepository = require('../repositories/BillRepository');
const PdfHelper = require('./pdf');

exports.getBillSlips = async (credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const billSlipList = await BillRepository.getBillsSlipList(companyId);

  return billSlipList;
};

exports.formatBillSlipNumber = (companyPrefixNumber, prefix, seq) =>
  `BORD-${companyPrefixNumber}${prefix}${seq.toString().padStart(5, '0')}`;

exports.getBillSlipNumber = async (endDate, company) => {
  const prefix = moment(endDate).format('MMYY');

  return BillSlipNumber
    .findOneAndUpdate({ prefix, company: company._id }, {}, { new: true, upsert: true, setDefaultsOnInsert: true })
    .lean();
};

exports.createBillSlips = async (billList, endDate, company) => {
  const month = moment(endDate).format('MM-YYYY');
  const prefix = moment(endDate).format('MMYY');
  const tppIds = [...new Set(billList.filter(bill => bill.client).map(bill => bill.client))];
  const billSlipList = await BillSlip.find({ thirdPartyPayer: { $in: tppIds }, month, company: company._id }).lean();

  if (tppIds.length === billSlipList.length) return;

  const slipNumber = await exports.getBillSlipNumber(endDate, company);
  const list = [];
  let { seq } = slipNumber;
  for (const tpp of tppIds) {
    if (!tpp || billSlipList.some(bs => bs.thirdPartyPayer.toHexString() === tpp)) continue;
    const number = exports.formatBillSlipNumber(company.prefixNumber, slipNumber.prefix, seq);
    list.push({ company: company._id, month, thirdPartyPayer: tpp, number });
    seq++;
  }

  await Promise.all([
    BillSlip.insertMany(list),
    BillSlipNumber.updateOne({ prefix, company: company._id }, { $set: { seq } }),
  ]);
};

exports.generatePdf = async (billSlipId) => {
  const billSlip = await BillSlip.findById(billSlipId).lean();
  const pdf = await PdfHelper.generatePdf({}, './src/data/billSlip.html', {
    format: 'A4',
    printBackground: true,
    landscape: true,
  });

  return { billSlipNumber: billSlip.number, pdf };
};
