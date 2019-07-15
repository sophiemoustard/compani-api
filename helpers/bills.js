const moment = require('moment');
const get = require('lodash/get');
const pick = require('lodash/pick');
const Event = require('../models/Event');
const Bill = require('../models/Bill');
const BillNumber = require('../models/BillNumber');
const FundingHistory = require('../models/FundingHistory');
const UtilsHelper = require('./utils');
const { HOURLY, THIRD_PARTY } = require('./constants');

exports.formatBillNumber = (prefix, seq) => `${prefix}${seq.toString().padStart(3, '0')}`;

exports.formatSubscriptionData = (bill) => {
  const events = bill.eventsList.map(ev => ({ eventId: ev.event, auxiliary: ev.auxiliary, startDate: ev.startDate, endDate: ev.endDate }));
  const matchingServiceVersion = UtilsHelper.getMatchingVersion(bill.startDate, bill.subscription.service, 'startDate');

  return {
    ...bill,
    subscription: bill.subscription._id,
    service: { serviceId: matchingServiceVersion._id, ...pick(matchingServiceVersion, ['name', 'nature']) },
    vat: matchingServiceVersion.vat,
    events,
  };
};

exports.formatCustomerBills = (customerBills, customer, number) => {
  const billedEvents = {};
  const bill = {
    customer: customer._id,
    subscriptions: [],
    billNumber: exports.formatBillNumber(number.prefix, number.seq),
    netInclTaxes: UtilsHelper.getFixedNumber(customerBills.total, 2),
    date: customerBills.bills[0].endDate,
  };

  for (const draftBill of customerBills.bills) {
    bill.subscriptions.push(exports.formatSubscriptionData(draftBill));
    for (const ev of draftBill.eventsList) {
      billedEvents[ev.event] = { ...ev };
    }
  }

  return { bill, billedEvents };
};

exports.formatThirdPartyPayerBills = (thirdPartyPayerBills, customer, number) => {
  let { seq } = number;
  const tppBills = [];
  const billedEvents = {};
  const fundingHistories = {};
  for (const tpp of thirdPartyPayerBills) {
    const tppBill = {
      customer: customer._id,
      client: tpp.bills[0].thirdPartyPayer,
      subscriptions: [],
      netInclTaxes: UtilsHelper.getFixedNumber(tpp.total, 2),
      date: tpp.bills[0].endDate,
    };
    if (!tpp.bills[0].externalBilling) {
      tppBill.billNumber = exports.formatBillNumber(number.prefix, seq);
      seq += 1;
    } else {
      tppBill.origin = THIRD_PARTY;
    }

    for (const draftBill of tpp.bills) {
      tppBill.subscriptions.push(exports.formatSubscriptionData(draftBill));
      for (const ev of draftBill.eventsList) {
        if (ev.history.nature === HOURLY) billedEvents[ev.event] = { ...ev, careHours: ev.history.careHours };
        else billedEvents[ev.event] = { ...ev };

        if (ev.history.month) {
          if (!fundingHistories[ev.history.fundingId]) fundingHistories[ev.history.fundingId] = { [ev.history.month]: ev.history };
          else if (!fundingHistories[ev.history.fundingId][ev.history.month]) fundingHistories[ev.history.fundingId][ev.history.month] = ev.history;
          else fundingHistories[ev.history.fundingId][ev.history.month].careHours += ev.history.careHours;
        } else if (!fundingHistories[ev.history.fundingId]) fundingHistories[ev.history.fundingId] = { ...ev.history };
        else if (ev.history.nature === HOURLY) {
          fundingHistories[ev.history.fundingId].careHours += ev.history.careHours;
        } else { // Funding with once frequency are only fixed !
          fundingHistories[ev.history.fundingId].amountTTC += ev.history.amountTTC;
        }
      }
    }
    tppBills.push(tppBill);
  }

  return { tppBills, billedEvents, fundingHistories };
};

exports.updateEvents = async (eventsToUpdate) => {
  const promises = [];
  for (const id of Object.keys(eventsToUpdate)) {
    promises.push(Event.findOneAndUpdate({ _id: id }, { $set: { isBilled: true, bills: eventsToUpdate[id] } }));
  }
  await Promise.all(promises);
};

exports.updateFundingHistories = async (histories) => {
  const promises = [];
  for (const id of Object.keys(histories)) {
    if (histories[id].amountTTC) {
      promises.push(FundingHistory.findOneAndUpdate(
        { fundingId: id },
        { $inc: { amountTTC: histories[id].amountTTC } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      ));
    } else if (histories[id].careHours) {
      promises.push(FundingHistory.findOneAndUpdate(
        { fundingId: id },
        { $inc: { careHours: histories[id].careHours } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      ));
    } else {
      for (const month of Object.keys(histories[id])) {
        promises.push(FundingHistory.findOneAndUpdate(
          { fundingId: id, month },
          { $inc: { careHours: histories[id][month].careHours } },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        ));
      }
    }
  }
  await Promise.all(promises);
};

exports.formatAndCreateBills = async (number, groupByCustomerBills) => {
  const promises = [];
  let eventsToUpdate = {};
  let fundingHistories = {};

  for (const draftBills of groupByCustomerBills) {
    if (draftBills.customerBills.bills && draftBills.customerBills.bills.length > 0) {
      const customerBillingInfo = exports.formatCustomerBills(draftBills.customerBills, draftBills.customer, number);
      eventsToUpdate = { ...eventsToUpdate, ...customerBillingInfo.billedEvents };
      number.seq += 1;
      promises.push((new Bill(customerBillingInfo.bill)).save());
    }

    if (draftBills.thirdPartyPayerBills && draftBills.thirdPartyPayerBills.length > 0) {
      const tppBillingInfo = exports.formatThirdPartyPayerBills(draftBills.thirdPartyPayerBills, draftBills.customer, number);
      fundingHistories = { ...fundingHistories, ...tppBillingInfo.fundingHistories };

      eventsToUpdate = { ...eventsToUpdate, ...tppBillingInfo.billedEvents };
      for (const bill of tppBillingInfo.tppBills) {
        promises.push((new Bill(bill)).save());
        if (bill.billNumber) number.seq += 1;
      }
    }
  }

  await BillNumber.findOneAndUpdate({ prefix: number.prefix }, { $set: { seq: number.seq } });
  await exports.updateFundingHistories(fundingHistories);
  await exports.updateEvents(eventsToUpdate);
  await Promise.all(promises);
};

const formatCustomerName = customer => (customer.identity.firstname
  ? `${customer.identity.title} ${customer.identity.firstname} ${customer.identity.lastname}`
  : `${customer.identity.title} ${customer.identity.lastname}`);

exports.getUnitInclTaxes = (bill, subscription) => {
  if (!bill.client) return subscription.unitInclTaxes;

  const funding = bill.customer.fundings.find(fund => fund.thirdPartyPayer.toHexString() === bill.client._id.toHexString());
  if (!funding) return 0;
  const version = UtilsHelper.getLastVersion(funding.versions, 'createdAt');

  return funding.nature === HOURLY
    ? (version.unitTTCRate * (1 - (version.customerParticipationRate / 100)))
    : version.amountTTC;
};

exports.formatPDF = (bill, company) => {
  const logo = 'https://res.cloudinary.com/alenvi/image/upload/v1507019444/images/business/alenvi_logo_complet_183x50.png';
  const computedData = {
    totalExclTaxes: 0,
    totalVAT: 0,
    netInclTaxes: UtilsHelper.formatPrice(bill.netInclTaxes),
    date: moment(bill.date).format('DD/MM/YYYY'),
    formattedSubs: [],
    formattedEvents: [],
    recipient: {
      address: bill.client ? get(bill, 'client.address', {}) : get(bill, 'customer.contact.address', {}),
      name: bill.client ? bill.client.name : formatCustomerName(bill.customer),
    }
  };

  for (const sub of bill.subscriptions) {
    computedData.totalExclTaxes += sub.exclTaxes;
    computedData.totalVAT += sub.inclTaxes - sub.exclTaxes;
    const formattedSubs = {
      unitInclTaxes: UtilsHelper.formatPrice(exports.getUnitInclTaxes(bill, sub)),
      inclTaxes: UtilsHelper.formatPrice(sub.inclTaxes),
      vat: sub.vat.toString().replace(/\./g, ','),
      service: sub.service.name,
    };
    if (sub.service.nature === HOURLY) {
      const formattedHours = UtilsHelper.formatFloatForExport(sub.hours);
      formattedSubs.hours = formattedHours === '' ? '' : `${formattedHours} h`;
    } else {
      formattedSubs.hours = sub.hours;
    }
    computedData.formattedSubs.push(formattedSubs);
    for (const ev of sub.events) {
      computedData.formattedEvents.push({
        identity: `${ev.auxiliary.identity.firstname.substring(0, 1)}. ${ev.auxiliary.identity.lastname}`,
        date: moment(ev.startDate).format('DD/MM'),
        startTime: moment(ev.startDate).format('HH:mm'),
        endTime: moment(ev.endDate).format('HH:mm'),
        service: sub.service.name,
      });
    }
  }
  computedData.totalExclTaxes = UtilsHelper.formatPrice(computedData.totalExclTaxes);
  computedData.totalVAT = UtilsHelper.formatPrice(computedData.totalVAT);

  return {
    bill: {
      billNumber: bill.billNumber,
      customer: bill.customer,
      ...computedData,
      company,
      logo,
    },
  };
};

const exportBillSubscribtions = (bill) => {
  if (!bill.subscriptions) return '';

  const subscriptions = bill.subscriptions.map(sub =>
    `${sub.service.name} - ${sub.hours} heures - ${UtilsHelper.formatPrice(sub.inclTaxes)} TTC`);

  return subscriptions.join('\r\n');
};

exports.exportBillsHistory = async (startDate, endDate) => {
  const query = {
    date: { $lte: endDate, $gte: startDate }
  };

  const bills = await Bill.find(query)
    .sort({ date: 'desc' })
    .populate({ path: 'customer', select: 'identity' })
    .populate({ path: 'client' })
    .lean();

  const header = [
    'Identifiant',
    'Date',
    'Id Bénéficiaire',
    'Bénéficiaire',
    'Id tiers payeur',
    'Tiers payeur',
    'Montant HT en €',
    'Montant TTC en €',
    'Services',
  ];

  const rows = [header];

  for (const bill of bills) {
    const customerId = get(bill.customer, '_id');
    const clientId = get(bill.client, '_id');
    let totalExclTaxesFormatted = '';

    if (bill.subscriptions != null) {
      let totalExclTaxes = 0;
      for (const sub of bill.subscriptions) {
        totalExclTaxes += sub.exclTaxes;
      }
      totalExclTaxesFormatted = UtilsHelper.formatFloatForExport(totalExclTaxes);
    }

    const cells = [
      bill.billNumber || '',
      bill.date ? moment(bill.date).format('DD/MM/YYYY') : '',
      customerId ? customerId.toHexString() : '',
      UtilsHelper.getFullTitleFromIdentity(get(bill.customer, 'identity')),
      clientId ? clientId.toHexString() : '',
      get(bill.client, 'name') || '',
      totalExclTaxesFormatted,
      UtilsHelper.formatFloatForExport(bill.netInclTaxes),
      exportBillSubscribtions(bill),
    ];

    rows.push(cells);
  }

  return rows;
};
