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
const DatesHelper = require('./dates');
const NumbersHelper = require('./numbers');
const PdfHelper = require('./pdf');
const BillPdf = require('../data/pdf/billing/bill');
const {
  HOURLY,
  THIRD_PARTY,
  CIVILITY_LIST,
  COMPANI,
  AUTOMATIC,
  MANUAL,
  ROUNDING_ERROR,
} = require('./constants');
const { CompaniDate } = require('./dates/companiDates');

exports.formatBillNumber = (companyPrefixNumber, prefix, seq) =>
  `FACT-${companyPrefixNumber}${prefix}${seq.toString().padStart(5, '0')}`;

exports.formatBilledEvents = (bill) => {
  const pickedFields = ['auxiliary', 'startDate', 'endDate', 'surcharges'];
  if (bill.thirdPartyPayer) pickedFields.push('inclTaxesTpp', 'exclTaxesTpp', 'fundingId');
  else pickedFields.push('inclTaxesCustomer', 'exclTaxesCustomer');

  return bill.eventsList.map(ev => (ev.history && ev.history.careHours &&
      !NumbersHelper.isEqualTo(ev.history.careHours, '0')
    ? { eventId: ev.event, ...pick(ev, pickedFields), careHours: ev.history.careHours }
    : { eventId: ev.event, ...pick(ev, pickedFields) }
  ));
};

exports.formatSubscriptionData = (bill) => {
  const matchingServiceVersion = UtilsHelper.getMatchingVersion(bill.endDate, bill.subscription.service, 'startDate');

  return {
    ...pick(bill, ['startDate', 'endDate', 'hours', 'unitInclTaxes', 'exclTaxes']),
    inclTaxes: NumbersHelper.toFixedToFloat(bill.inclTaxes),
    subscription: bill.subscription._id,
    service: { serviceId: matchingServiceVersion._id, ...pick(matchingServiceVersion, ['name', 'nature']) },
    vat: matchingServiceVersion.vat,
    events: exports.formatBilledEvents(bill),
    discount: NumbersHelper.toFixedToFloat(bill.discount),
  };
};

exports.formatBillingItemData = bill => ({
  ...pick(bill, ['startDate', 'endDate', 'unitInclTaxes', 'exclTaxes', 'vat']),
  inclTaxes: NumbersHelper.toFixedToFloat(bill.inclTaxes),
  billingItem: bill.billingItem._id,
  events: bill.eventsList.map(ev => ({ ...pick(ev, ['startDate', 'endDate', 'auxiliary']), eventId: ev.event })),
  name: bill.billingItem.name,
  count: bill.eventsList.length,
  discount: NumbersHelper.toFixedToFloat(bill.discount),
});

exports.formatCustomerBills = (customerBills, customer, number, company) => {
  const billedEvents = {};
  const bill = {
    customer: customer._id,
    subscriptions: [],
    number: exports.formatBillNumber(company.prefixNumber, number.prefix, number.seq),
    netInclTaxes: customerBills.total,
    date: customerBills.bills[0].endDate,
    shouldBeSent: customerBills.shouldBeSent,
    type: AUTOMATIC,
    company: company._id,
    billingItemList: [],
  };

  for (const draftBill of customerBills.bills) {
    if (draftBill.subscription) {
      bill.subscriptions.push(exports.formatSubscriptionData(draftBill));
      for (const ev of draftBill.eventsList) {
        billedEvents[ev.event] = { ...ev };
      }
    } else {
      bill.billingItemList.push(exports.formatBillingItemData(draftBill));
      for (const ev of draftBill.eventsList) {
        if (!billedEvents[ev.event]) {
          billedEvents[ev.event] = { event: ev.event, exclTaxesCustomer: 0, inclTaxesCustomer: 0 };
        }
        if (!billedEvents[ev.event].billingItems) billedEvents[ev.event].billingItems = [];
        if (!billedEvents[ev.event].exclTaxesCustomer) billedEvents[ev.event].exclTaxesCustomer = 0;
        if (!billedEvents[ev.event].inclTaxesCustomer) billedEvents[ev.event].inclTaxesCustomer = 0;

        billedEvents[ev.event].billingItems.push({
          billingItem: draftBill.billingItem._id,
          inclTaxes: draftBill.unitInclTaxes,
          exclTaxes: draftBill.unitExclTaxes,
        });
        billedEvents[ev.event].exclTaxesCustomer = NumbersHelper.add(
          billedEvents[ev.event].exclTaxesCustomer,
          draftBill.unitExclTaxes
        );
        billedEvents[ev.event].inclTaxesCustomer = NumbersHelper.add(
          billedEvents[ev.event].inclTaxesCustomer,
          draftBill.unitInclTaxes
        );
      }
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
      netInclTaxes: tpp.total,
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
          } else {
            histories[ev.history.fundingId][ev.history.month].careHours = NumbersHelper.add(
              histories[ev.history.fundingId][ev.history.month].careHours,
              ev.history.careHours
            );
          }
        } else if (!histories[ev.history.fundingId]) histories[ev.history.fundingId] = { ...ev.history };
        else if (ev.history.nature === HOURLY) {
          histories[ev.history.fundingId].careHours = NumbersHelper.add(
            histories[ev.history.fundingId].careHours,
            ev.history.careHours
          );
        } else { // Funding with once frequency are only fixed !
          histories[ev.history.fundingId].amountTTC = NumbersHelper.add(
            histories[ev.history.fundingId].amountTTC,
            ev.history.amountTTC
          );
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
    let fundingHistory = await FundingHistory
      .findOne({ fundingId: id, company: companyId }, { amountTTC: 1, careHours: 1 })
      .lean();

    if (histories[id].amountTTC && !NumbersHelper.isEqualTo(histories[id].amountTTC, '0')) {
      const newAmountTTC = NumbersHelper.add(get(fundingHistory, 'amountTTC') || 0, histories[id].amountTTC);
      promises.push(FundingHistory.updateOne(
        { fundingId: id, company: companyId },
        { $set: { amountTTC: newAmountTTC } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      ));
    } else if (histories[id].careHours && !NumbersHelper.isEqualTo(histories[id].careHours, '0')) {
      const newCareHours = NumbersHelper.add(get(fundingHistory, 'careHours') || 0, histories[id].careHours);
      promises.push(FundingHistory.updateOne(
        { fundingId: id, company: companyId },
        { $set: { careHours: newCareHours } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      ));
    } else {
      for (const month of Object.keys(histories[id])) {
        fundingHistory = await FundingHistory
          .findOne({ fundingId: id, company: companyId, month }, { amountTTC: 1, careHours: 1 })
          .lean();
        const newCareHours = NumbersHelper.add(get(fundingHistory, 'careHours') || 0, histories[id][month].careHours);

        promises.push(FundingHistory.updateOne(
          { fundingId: id, month, company: companyId },
          { $set: { careHours: newCareHours } },
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
      for (const eventId of Object.keys(tppBillingInfo.billedEvents)) {
        if (!eventsToUpdate[eventId]) eventsToUpdate[eventId] = tppBillingInfo.billedEvents[eventId];
        else eventsToUpdate[eventId] = { ...tppBillingInfo.billedEvents[eventId], ...eventsToUpdate[eventId] };
      }
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

exports.list = async (query, credentials) => {
  const { type, startDate, endDate } = query;

  let findQuery = { type, company: get(credentials, 'company._id') };
  if (startDate && endDate) findQuery = { ...findQuery, date: { $gte: startDate, $lte: endDate } };

  const bills = Bill.find(findQuery)
    .populate({ path: 'customer', select: 'identity' })
    .populate({ path: 'billingItemList', populate: { path: 'billingItem', select: 'name' } })
    .populate({ path: 'thirdPartyPayer', select: 'name' })
    .lean();

  return bills;
};

exports.formatBillingItem = (bi, bddBillingItemList) => {
  const bddBillingItem = bddBillingItemList.find(bddBI => UtilsHelper.areObjectIdsEquals(bddBI._id, bi.billingItem));
  const vatMultiplier = NumbersHelper.divide(bddBillingItem.vat, 100);
  const inclTaxes = NumbersHelper.toFixedToFloat(NumbersHelper.multiply(bi.unitInclTaxes, bi.count));
  const exclTaxes = NumbersHelper.divide(inclTaxes, NumbersHelper.add(vatMultiplier, '1'));

  return {
    billingItem: bi.billingItem,
    name: bddBillingItem.name,
    unitInclTaxes: bi.unitInclTaxes,
    count: bi.count,
    inclTaxes,
    exclTaxes,
    vat: bddBillingItem.vat,
  };
};

exports.formatAndCreateBill = async (payload, credentials) => {
  const { date, billingItemList } = payload;
  const { company } = credentials;

  const billNumber = await exports.getBillNumber(date, company._id);

  const bddBillingItemList = await BillingItem
    .find({ _id: { $in: billingItemList.map(bi => bi.billingItem) } }, { vat: 1, name: 1 })
    .lean();

  let netInclTaxes = NumbersHelper.toString('0');
  for (const bi of billingItemList) {
    netInclTaxes = NumbersHelper.add(netInclTaxes, NumbersHelper.multiply(bi.count, bi.unitInclTaxes));
  }

  const bill = {
    ...payload,
    netInclTaxes: NumbersHelper.toFixedToFloat(netInclTaxes),
    type: MANUAL,
    number: exports.formatBillNumber(company.prefixNumber, billNumber.prefix, billNumber.seq),
    billingItemList: billingItemList.map(bi => exports.formatBillingItem(bi, bddBillingItemList)),
    company: company._id,
  };

  await BillNumber.updateOne(
    { prefix: billNumber.prefix, company: company._id },
    { $set: { seq: billNumber.seq + 1 } }
  );
  await Bill.create(bill);
};

exports.getBills = async (query, credentials) => {
  const { startDate, endDate, ...billsQuery } = query;
  if (startDate || endDate) billsQuery.date = UtilsHelper.getDateQuery({ startDate, endDate });
  billsQuery.company = get(credentials, 'company._id', null);

  return Bill.find(billsQuery).populate({ path: 'thirdPartyPayer', select: '_id name' }).lean();
};

exports.filterFundingVersion = date => ver => DatesHelper.isSameOrBefore(ver.createdAt, date);

const getMatchingFunding = (bill, event) => bill.customer.fundings
  .map(fund => UtilsHelper.getMatchingVersion(bill.createdAt, fund, 'createdAt', exports.filterFundingVersion))
  .find(fund => UtilsHelper.areObjectIdsEquals(fund.thirdPartyPayer, bill.thirdPartyPayer._id) &&
      CompaniDate(fund.startDate).isSameOrBefore(event.startDate) &&
      (!fund.endDate || CompaniDate(fund.endDate).isSameOrAfter(event.startDate)));

exports.getUnitInclTaxes = (bill, subscription) => {
  if (!bill.thirdPartyPayer) return NumbersHelper.toString(subscription.unitInclTaxes);

  const lastEvent = UtilsHelper.getLastVersion(subscription.events, 'startDate');
  const matchingFundingVersion = getMatchingFunding(bill, lastEvent);
  if (!matchingFundingVersion) return NumbersHelper.toString(0);

  if (matchingFundingVersion.nature === HOURLY) {
    const customerParticipationRate = NumbersHelper.divide(matchingFundingVersion.customerParticipationRate, 100);
    const tppParticipationRate = NumbersHelper.subtract(1, customerParticipationRate);

    return NumbersHelper.multiply(matchingFundingVersion.unitTTCRate, tppParticipationRate);
  }

  return NumbersHelper.toString(subscription.unitInclTaxes);
};

exports.computeSurcharge = (subscription) => {
  let totalSurcharge = NumbersHelper.toString(0);
  for (const event of subscription.events) {
    if (!event.surcharges || event.surcharges.length === 0) continue;

    for (const surcharge of event.surcharges) {
      const duration = surcharge.startHour
        ? NumbersHelper.divide(moment(surcharge.endHour).diff(surcharge.startHour, 'm'), 60)
        : NumbersHelper.divide(moment(event.endDate).diff(event.startDate, 'm'), 60);

      const surchargePrice = NumbersHelper.multiply(
        duration,
        subscription.unitInclTaxes,
        NumbersHelper.divide(surcharge.percentage, 100)
      );

      totalSurcharge = NumbersHelper.add(totalSurcharge, surchargePrice);
    }
  }

  return totalSurcharge;
};

exports.formatBillDetailsForPdf = (bill) => {
  let totalExclTaxes = NumbersHelper.toString(0);
  let totalDiscount = NumbersHelper.toString(0);
  let totalSurcharge = NumbersHelper.toString(0);
  let totalSubscription = NumbersHelper.toString(0);

  const formattedDetails = [];
  for (const sub of bill.subscriptions) {
    const subExclTaxesWithDiscount = UtilsHelper.computeExclTaxesWithDiscount(sub.inclTaxes, sub.discount, sub.vat);
    totalExclTaxes = NumbersHelper.add(totalExclTaxes, subExclTaxesWithDiscount);

    const volume = sub.service.nature === HOURLY ? sub.hours : sub.events.length;
    const unitInclTaxes = exports.getUnitInclTaxes(bill, sub);

    let total = 0;
    const customerFundings = get(bill, 'customer.fundings') || [];
    const matchingFunding = customerFundings
      .find(funding => UtilsHelper.areObjectIdsEquals(funding.subscription, sub.subscription));

    if (bill.thirdPartyPayer && matchingFunding && matchingFunding.nature === HOURLY) {
      total = NumbersHelper.toString(sub.inclTaxes);
    } else {
      total = NumbersHelper.multiply(volume, unitInclTaxes);
    }

    formattedDetails.push({
      unitInclTaxes,
      vat: sub.vat || 0,
      name: sub.service.name,
      volume: sub.service.nature === HOURLY ? UtilsHelper.formatHour(volume) : volume,
      total,
    });

    totalSubscription = NumbersHelper.add(totalSubscription, total);
    totalSurcharge = NumbersHelper.add(totalSurcharge, exports.computeSurcharge(sub));
    totalDiscount = NumbersHelper.add(totalDiscount, sub.discount);
  }

  if (!NumbersHelper.isEqualTo(totalSurcharge, '0')) {
    formattedDetails.push({ name: 'Majorations', total: totalSurcharge });
  }

  let totalBillingItem = 0;
  if (bill.billingItemList) {
    for (const bi of bill.billingItemList) {
      const biExclTaxesWithDiscount = UtilsHelper.computeExclTaxesWithDiscount(bi.inclTaxes, bi.discount, bi.vat);
      totalExclTaxes = NumbersHelper.add(totalExclTaxes, biExclTaxesWithDiscount);
      totalBillingItem = NumbersHelper.add(totalBillingItem, bi.inclTaxes);
      totalDiscount = NumbersHelper.add(totalDiscount, bi.discount);

      formattedDetails.push({
        ...pick(bi, ['name', 'vat']),
        unitInclTaxes: NumbersHelper.toString(bi.unitInclTaxes),
        volume: UtilsHelper.roundFrenchNumber(bi.count),
        total: NumbersHelper.toString(bi.inclTaxes),
      });
    }
  }

  if (!NumbersHelper.isEqualTo(totalDiscount, '0')) formattedDetails.push({ name: 'Remises', total: -totalDiscount });

  const totalCustomer = NumbersHelper.add(totalSubscription, totalBillingItem, totalSurcharge);
  const totalTPP = NumbersHelper.add(NumbersHelper.subtract(bill.netInclTaxes, totalCustomer), totalDiscount);
  if (NumbersHelper.isLessThan(totalTPP, -ROUNDING_ERROR) && !bill.thirdPartyPayer) {
    formattedDetails.push({ name: 'Prise en charge du/des tiers(s) payeur(s)', total: totalTPP });
  }

  return {
    totalExclTaxes: UtilsHelper.formatPrice(totalExclTaxes),
    totalVAT: UtilsHelper.formatPrice(NumbersHelper.subtract(bill.netInclTaxes, totalExclTaxes)),
    formattedDetails,
  };
};

exports.formatEventsForPdf = (events, service) => {
  const formattedEvents = [];

  const sortedEvents = [...events].sort(DatesHelper.ascendingSort('startDate'));
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
    ...exports.formatBillDetailsForPdf(bill),
  };

  for (const sub of bill.subscriptions) {
    const formattedEvents = exports.formatEventsForPdf(sub.events, sub.service);
    computedData.formattedEvents.push(...formattedEvents);
  }

  return {
    bill: {
      type: bill.type,
      number: bill.number,
      customer: {
        identity: { ...get(bill, 'customer.identity'), title: CIVILITY_LIST[get(bill, 'customer.identity.title')] },
        contact: get(bill, 'customer.contact'),
      },
      ...computedData,
      company: pick(company, ['rcs', 'rna', 'address', 'logo', 'name', 'customersConfig.billFooter']),
    },
  };
};

exports.generateBillPdf = async (params, credentials) => {
  const bill = await Bill.findOne({ _id: params._id, origin: COMPANI })
    .populate({ path: 'thirdPartyPayer', select: '_id name address' })
    .populate({ path: 'customer', select: '_id identity contact fundings' })
    .populate({ path: 'subscriptions.events.auxiliary', select: 'identity' })
    .lean();

  const company = await Company
    .findOne(
      { _id: get(credentials, 'company._id') },
      { rcs: 1, rna: 1, address: 1, logo: 1, name: 1, 'customersConfig.billFooter': 1 }
    )
    .lean();
  const data = exports.formatPdf(bill, company);
  const template = await BillPdf.getPdfContent(data);
  const pdf = await PdfHelper.generatePdf(template);

  return { pdf, billNumber: bill.number };
};
