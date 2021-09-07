const moment = require('moment');
const get = require('lodash/get');
const pick = require('lodash/pick');
const Event = require('../models/Event');
const Bill = require('../models/Bill');
const BillingItem = require('../models/BillingItem');
const Company = require('../models/Company');
const BillNumber = require('../models/BillNumber');
const CreditNote = require('../models/CreditNote');
const FundingHistory = require('../models/FundingHistory');
const BillSlipHelper = require('./billSlips');
const UtilsHelper = require('./utils');
const PdfHelper = require('./pdf');
const BillPdf = require('../data/pdf/billing/bill');
const { HOURLY, THIRD_PARTY, CIVILITY_LIST, COMPANI, AUTOMATIC, MANUAL } = require('./constants');

exports.formatBillNumber = (companyPrefixNumber, prefix, seq) =>
  `FACT-${companyPrefixNumber}${prefix}${seq.toString().padStart(5, '0')}`;

exports.formatBilledEvents = (bill) => {
  const pickedFields = ['auxiliary', 'startDate', 'endDate', 'surcharges'];
  if (bill.thirdPartyPayer) pickedFields.push('inclTaxesTpp', 'exclTaxesTpp', 'fundingId');
  else pickedFields.push('inclTaxesCustomer', 'exclTaxesCustomer');

  return bill.eventsList.map(ev => (ev.history && ev.history.careHours
    ? { eventId: ev.event, ...pick(ev, pickedFields), careHours: ev.history.careHours }
    : { eventId: ev.event, ...pick(ev, pickedFields) }
  ));
};

exports.formatSubscriptionData = (bill) => {
  const matchingServiceVersion = UtilsHelper.getMatchingVersion(bill.endDate, bill.subscription.service, 'startDate');

  return {
    ...pick(bill, ['startDate', 'endDate', 'hours', 'unitInclTaxes', 'exclTaxes', 'inclTaxes', 'discount']),
    subscription: bill.subscription._id,
    service: { serviceId: matchingServiceVersion._id, ...pick(matchingServiceVersion, ['name', 'nature']) },
    vat: matchingServiceVersion.vat,
    events: exports.formatBilledEvents(bill),
  };
};

exports.formatCustomerBills = (customerBills, customer, number, company) => {
  const billedEvents = {};
  const bill = {
    customer: customer._id,
    subscriptions: [],
    number: exports.formatBillNumber(company.prefixNumber, number.prefix, number.seq),
    netInclTaxes: UtilsHelper.getFixedNumber(customerBills.total, 2),
    date: customerBills.bills[0].endDate,
    shouldBeSent: customerBills.shouldBeSent,
    type: AUTOMATIC,
    company: company._id,
  };

  for (const draftBill of customerBills.bills) {
    bill.subscriptions.push(exports.formatSubscriptionData(draftBill));
    for (const ev of draftBill.eventsList) {
      billedEvents[ev.event] = { ...ev };
    }
  }

  return { bill, billedEvents };
};

exports.formatThirdPartyPayerBills = (thirdPartyPayerBills, customer, number, company) => {
  let { seq } = number;
  const tppBills = [];
  const billedEvents = {};
  const histories = {};
  for (const tpp of thirdPartyPayerBills) {
    const tppBill = {
      customer: customer._id,
      thirdPartyPayer: get(tpp.bills[0], 'thirdPartyPayer._id', null),
      subscriptions: [],
      netInclTaxes: UtilsHelper.getFixedNumber(tpp.total, 2),
      date: tpp.bills[0].endDate,
      type: AUTOMATIC,
      company: company._id,
    };
    if (!tpp.bills[0].externalBilling) {
      tppBill.number = exports.formatBillNumber(company.prefixNumber, number.prefix, seq);
      seq += 1;
    } else tppBill.origin = THIRD_PARTY;

    for (const draftBill of tpp.bills) {
      tppBill.subscriptions.push(exports.formatSubscriptionData(draftBill));
      for (const ev of draftBill.eventsList) {
        if (ev.history.nature === HOURLY) billedEvents[ev.event] = { ...ev, careHours: ev.history.careHours };
        else billedEvents[ev.event] = { ...ev };

        if (ev.history.month) {
          if (!histories[ev.history.fundingId]) histories[ev.history.fundingId] = { [ev.history.month]: ev.history };
          else if (!histories[ev.history.fundingId][ev.history.month]) {
            histories[ev.history.fundingId][ev.history.month] = ev.history;
          } else histories[ev.history.fundingId][ev.history.month].careHours += ev.history.careHours;
        } else if (!histories[ev.history.fundingId]) histories[ev.history.fundingId] = { ...ev.history };
        else if (ev.history.nature === HOURLY) {
          histories[ev.history.fundingId].careHours += ev.history.careHours;
        } else { // Funding with once frequency are only fixed !
          histories[ev.history.fundingId].amountTTC += ev.history.amountTTC;
        }
      }
    }
    tppBills.push(tppBill);
  }

  return { tppBills, billedEvents, fundingHistories: histories };
};

exports.updateEvents = async (eventsToUpdate) => {
  const promises = [];
  for (const id of Object.keys(eventsToUpdate)) {
    promises.push(Event.updateOne({ _id: id }, { $set: { isBilled: true, bills: eventsToUpdate[id] } }));
  }
  await Promise.all(promises);
};

exports.updateFundingHistories = async (histories, companyId) => {
  const promises = [];
  for (const id of Object.keys(histories)) {
    if (histories[id].amountTTC) {
      promises.push(FundingHistory.updateOne(
        { fundingId: id, company: companyId },
        { $inc: { amountTTC: histories[id].amountTTC } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      ));
    } else if (histories[id].careHours) {
      promises.push(FundingHistory.updateOne(
        { fundingId: id, company: companyId },
        { $inc: { careHours: histories[id].careHours } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      ));
    } else {
      for (const month of Object.keys(histories[id])) {
        promises.push(FundingHistory.updateOne(
          { fundingId: id, month, company: companyId },
          { $inc: { careHours: histories[id][month].careHours } },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        ));
      }
    }
  }
  await Promise.all(promises);
};

exports.getBillNumber = async (endDate, companyId) => {
  const prefix = moment(endDate).format('MMYY');

  return BillNumber
    .findOneAndUpdate({ prefix, company: companyId }, {}, { new: true, upsert: true, setDefaultsOnInsert: true })
    .lean();
};

exports.formatAndCreateList = async (groupByCustomerBills, credentials) => {
  const billList = [];
  let eventsToUpdate = {};
  let fundingHistories = {};
  const { company } = credentials;
  const { endDate } = groupByCustomerBills[0];
  const number = await exports.getBillNumber(endDate, company._id);

  for (const draftBills of groupByCustomerBills) {
    const { customer, customerBills, thirdPartyPayerBills } = draftBills;
    if (customerBills.bills && customerBills.bills.length > 0) {
      const customerBillingInfo = exports.formatCustomerBills(customerBills, customer, number, company);
      eventsToUpdate = { ...eventsToUpdate, ...customerBillingInfo.billedEvents };
      number.seq += 1;
      billList.push(customerBillingInfo.bill);
    }

    if (thirdPartyPayerBills && thirdPartyPayerBills.length > 0) {
      const tppBillingInfo = exports.formatThirdPartyPayerBills(thirdPartyPayerBills, customer, number, company);
      fundingHistories = { ...fundingHistories, ...tppBillingInfo.fundingHistories };
      eventsToUpdate = { ...eventsToUpdate, ...tppBillingInfo.billedEvents };
      for (const bill of tppBillingInfo.tppBills) {
        billList.push(bill);
        if (bill.number) number.seq += 1;
      }
    }
  }

  // Order is important
  await Bill.insertMany(billList);
  await exports.updateEvents(eventsToUpdate);
  await exports.updateFundingHistories(fundingHistories, company._id);
  await BillNumber.updateOne({ prefix: number.prefix, company: company._id }, { $set: { seq: number.seq } });
  await BillSlipHelper.createBillSlips(billList, endDate, credentials.company);
  await CreditNote.updateMany(
    { events: { $elemMatch: { eventId: { $in: Object.keys(eventsToUpdate) } } } },
    { isEditable: false }
  );
};

exports.formatAndCreateBill = async (payload, credentials) => {
  const { customer, date, billingItemList, netInclTaxes } = payload;
  const { company } = credentials;

  const billNumber = await exports.getBillNumber(date, company._id);
  const seq = billNumber.seq + 1;
  const number = exports.formatBillNumber(company.prefixNumber, billNumber.prefix, seq);

  const bddBillingItemList = await BillingItem
    .find({ _id: { $in: billingItemList.map(bi => bi.billingItem) } }, { vat: 1 })
    .lean();
  const formattedBillingItemList = billingItemList.map((bi) => {
    const bddBillingItem = bddBillingItemList.find(bddBI => UtilsHelper.areObjectIdsEquals(bddBI._id, bi.billingItem));
    const vat = bddBillingItem.vat / 100;

    return {
      billingItem: bi.billingItem,
      unitInclTaxes: bi.unitInclTaxes,
      count: bi.count,
      inclTaxes: bi.unitInclTaxes * bi.count,
      exclTaxes: (bi.unitInclTaxes / (1 + vat)) * bi.count,
    };
  });

  const bill = {
    number,
    date,
    customer,
    netInclTaxes,
    type: MANUAL,
    billingItemList: formattedBillingItemList,
    company: company._id,
  };

  await BillNumber.updateOne({ prefix: billNumber.prefix, company: company._id }, { $set: { seq } });
  await Bill.create(bill);
};

exports.getBills = async (query, credentials) => {
  const { startDate, endDate, ...billsQuery } = query;
  if (startDate || endDate) billsQuery.date = UtilsHelper.getDateQuery({ startDate, endDate });
  billsQuery.company = get(credentials, 'company._id', null);

  return Bill.find(billsQuery).populate({ path: 'thirdPartyPayer', select: '_id name' }).lean();
};

exports.getUnitInclTaxes = (bill, subscription) => {
  if (!bill.thirdPartyPayer) return subscription.unitInclTaxes;

  const funding = bill.customer.fundings
    .find(fund => fund.thirdPartyPayer.toHexString() === bill.thirdPartyPayer._id.toHexString());
  if (!funding) return 0;
  const version = UtilsHelper.getLastVersion(funding.versions, 'createdAt');

  return funding.nature === HOURLY
    ? (version.unitTTCRate * (1 - (version.customerParticipationRate / 100)))
    : version.amountTTC;
};

exports.formatBillSubscriptionsForPdf = (bill) => {
  let totalExclTaxes = 0;
  let totalVAT = 0;
  const formattedSubs = [];

  for (const sub of bill.subscriptions) {
    totalExclTaxes += sub.exclTaxes;
    totalVAT += sub.inclTaxes - sub.exclTaxes;
    const formattedSub = {
      unitInclTaxes: UtilsHelper.formatPrice(exports.getUnitInclTaxes(bill, sub)),
      inclTaxes: UtilsHelper.formatPrice(sub.inclTaxes),
      vat: sub.vat ? sub.vat.toString().replace(/\./g, ',') : 0,
      service: sub.service.name,
    };
    if (sub.service.nature === HOURLY) {
      const formattedHours = UtilsHelper.formatFloatForExport(sub.hours);
      formattedSub.volume = formattedHours === '' ? '' : `${formattedHours} h`;
    } else {
      formattedSub.volume = sub.events.length;
    }
    formattedSubs.push(formattedSub);
  }

  totalExclTaxes = UtilsHelper.formatPrice(totalExclTaxes);
  totalVAT = UtilsHelper.formatPrice(totalVAT);

  return { totalExclTaxes, totalVAT, formattedSubs };
};

exports.formatEventsForPdf = (events, service) => {
  const formattedEvents = [];

  const sortedEvents = events.map(ev => ev).sort((ev1, ev2) => ev1.startDate - ev2.startDate);
  for (const ev of sortedEvents) {
    const formattedEvent = {
      identity: `${ev.auxiliary.identity.firstname.substring(0, 1)}. ${ev.auxiliary.identity.lastname}`,
      date: moment(ev.startDate).format('DD/MM'),
      startTime: moment(ev.startDate).format('HH:mm'),
      endTime: moment(ev.endDate).format('HH:mm'),
      service: service.name,
    };
    if (ev.surcharges) {
      formattedEvent.surcharges = PdfHelper.formatEventSurchargesForPdf(ev.surcharges);
    }
    formattedEvents.push(formattedEvent);
  }

  return formattedEvents;
};

exports.formatPdf = (bill, company) => {
  const computedData = {
    netInclTaxes: UtilsHelper.formatPrice(bill.netInclTaxes),
    date: moment(bill.date).format('DD/MM/YYYY'),
    formattedEvents: [],
    recipient: {
      address: bill.thirdPartyPayer
        ? get(bill, 'thirdPartyPayer.address', {})
        : get(bill, 'customer.contact.primaryAddress', {}),
      name: bill.thirdPartyPayer
        ? bill.thirdPartyPayer.name
        : UtilsHelper.formatIdentity(bill.customer.identity, 'TFL'),
    },
    forTpp: !!bill.thirdPartyPayer,
    ...exports.formatBillSubscriptionsForPdf(bill),
  };

  for (const sub of bill.subscriptions) {
    const formattedEvents = exports.formatEventsForPdf(sub.events, sub.service);
    computedData.formattedEvents.push(...formattedEvents);
  }

  return {
    bill: {
      number: bill.number,
      customer: {
        identity: { ...get(bill, 'customer.identity'), title: CIVILITY_LIST[get(bill, 'customer.identity.title')] },
        contact: get(bill, 'customer.contact'),
      },
      ...computedData,
      company: pick(company, ['rcs', 'rna', 'address', 'logo', 'name']),
    },
  };
};

exports.generateBillPdf = async (params, credentials) => {
  const bill = await Bill.findOne({ _id: params._id, origin: COMPANI })
    .populate({ path: 'thirdPartyPayer', select: '_id name address' })
    .populate({ path: 'customer', select: '_id identity contact fundings' })
    .populate({ path: 'subscriptions.events.auxiliary', select: 'identity' })
    .lean();

  const company = await Company.findOne({ _id: get(credentials, 'company._id', null) }).lean();
  const data = exports.formatPdf(bill, company);
  const template = await BillPdf.getPdfContent(data);
  const pdf = await PdfHelper.generatePdf(template);

  return { pdf, billNumber: bill.number };
};
