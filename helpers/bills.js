const moment = require('moment');
const get = require('lodash/get');
const Event = require('../models/Event');
const Bill = require('../models/Bill');
const BillNumber = require('../models/BillNumber');
const FundingHistory = require('../models/FundingHistory');
const UtilsHelper = require('./utils');
const { HOURLY } = require('./constants');

exports.formatBillNumber = (prefix, seq) => `${prefix}${seq.toString().padStart(3, '0')}`;

exports.formatSubscriptionData = (bill) => {
  const events = bill.eventsList.map(ev => ev.event);
  const matchingServiceVersion = UtilsHelper.getMatchingVersion(bill.startDate, bill.subscription.service, 'startDate');

  return {
    ...bill,
    subscription: bill.subscription._id,
    service: matchingServiceVersion.name,
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
    computedData.formattedSubs.push({
      unitExclTaxes: UtilsHelper.formatPrice(sub.unitExclTaxes),
      inclTaxes: UtilsHelper.formatPrice(sub.inclTaxes),
      vat: sub.vat.toString().replace(/\./g, ','),
      service: sub.service,
      hours: sub.hours
    });
    for (const event of sub.events) {
      computedData.formattedEvents.push({
        identity: `${event.auxiliary.identity.firstname.substring(0, 1)}. ${event.auxiliary.identity.lastname}`,
        date: moment(event.startDate).format('DD/MM'),
        startTime: moment(event.startDate).format('HH:mm'),
        endTime: moment(event.endDate).format('HH:mm'),
        service: sub.service,
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
