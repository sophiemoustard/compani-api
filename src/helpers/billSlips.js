const moment = require('moment');
const get = require('lodash/get');
const pick = require('lodash/pick');
const BillSlip = require('../models/BillSlip');
const Bill = require('../models/Bill');
const BillSlipNumber = require('../models/BillSlipNumber');
const BillRepository = require('../repositories/BillRepository');
const PdfHelper = require('./pdf');
const UtilsHelper = require('./utils');
const { MONTHLY, HOURLY } = require('./constants');

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

exports.formatFundingAndBillInfo = (bill, fundingVersion) => ({
  billNumber: bill.number,
  date: moment(bill.date).format('DD/MM/YYYY'),
  customer: get(bill, 'customer.identity.lastname'),
  folderNumber: fundingVersion.folderNumber,
  tppParticipationRate: UtilsHelper.formatPercentage((100 - fundingVersion.customerParticipationRate) / 100),
  customerParticipationRate: UtilsHelper.formatPercentage(fundingVersion.customerParticipationRate / 100),
  careHours: UtilsHelper.formatHour(bill.careHours),
  unitTTCRate: UtilsHelper.formatPrice(bill.unitTTCRate),
  plannedCareHours: 0,
  netInclTaxes: 0,
});

exports.formatBillsForPdf = (billList) => {
  const bills = {};
  for (const bill of billList) {
    for (const subscription of bill.subscriptions) {
      for (const event of subscription.events) {
        if (!bills[event.fundingId]) {
          const matchingFunding = bill.customer.fundings
            .find(f => f._id.toHexString() === event.fundingId.toHexString());
          if (!matchingFunding || matchingFunding.frequency !== MONTHLY || matchingFunding.nature !== HOURLY) continue;

          const matchingVersion = UtilsHelper.mergeLastVersionWithBaseObject(matchingFunding, 'createdAt');
          if (!matchingVersion) continue;

          bills[event.fundingId] = exports.formatFundingAndBillInfo(bill, matchingVersion);
        }

        bills[event.fundingId].plannedCareHours += event.careHours;
        bills[event.fundingId].netInclTaxes += event.inclTaxesTpp;
      }
    }
  }

  let total = 0;
  const formattedBills = [];
  for (const bill of Object.values(bills)) {
    total += bill.netInclTaxes;
    formattedBills.push({
      ...bill,
      netInclTaxes: UtilsHelper.formatPrice(bill.netInclTaxes),
      plannedCareHours: UtilsHelper.formatHour(bill.plannedCareHours),
    });
  }

  return { total: UtilsHelper.formatPrice(total), formattedBills };
};

exports.formatPdf = (billSlip, billList, company) => {
  const { total, formattedBills } = exports.formatBillsForPdf(billList);

  return {
    billSlip: {
      ...pick(billSlip, ['number', 'thirdPartyPayer']),
      date: moment().format('DD/MM/YYYY'),
      company: {
        ...pick(company, ['iban', 'bic', 'siren']),
        address: get(company, 'address.fullAddress') || '',
        logo: 'https://res.cloudinary.com/alenvi/image/upload/v1507019444/images/business/alenvi_logo_complet_183x50.png',
        email: 'support@alenvi.io',
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

exports.generatePdf = async (billSlipId, credentials) => {
  const billSlip = await BillSlip.findById(billSlipId).populate('thirdPartyPayer').lean();
  const query = {
    client: billSlip.thirdPartyPayer,
    date: {
      $gte: moment(billSlip.month, 'MM-YYYY').startOf('month').toDate(),
      $lte: moment(billSlip.month, 'MM-YYYY').endOf('month').toDate(),
    },
    company: credentials.company._id,
  };
  const billList = await Bill.find(query)
    .populate({ path: 'customer', select: 'fundings identity' })
    .lean();

  const data = exports.formatPdf(billSlip, billList, credentials.company);
  const pdf = await PdfHelper.generatePdf(data, './src/data/billSlip.html', {
    format: 'A4',
    printBackground: true,
    landscape: true,
  });

  return { billSlipNumber: billSlip.number, pdf };
};
