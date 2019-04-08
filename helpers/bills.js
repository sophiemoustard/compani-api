const Event = require('../models/Event');
const Bill = require('../models/Bill');
const BillNumber = require('../models/BillNumber');
const FundingHistory = require('../models/FundingHistory');
const { getMatchingVersion } = require('../helpers/utils');

const formatBillNumber = (prefix, seq) => `${prefix}-${seq.toString().padStart(3, '0')}`;

const formatSubscriptionData = (bill) => {
  const events = bill.eventsList.map(ev => ev.event);
  return {
    ...bill,
    subscription: bill.subscription._id,
    vat: getMatchingVersion(bill.startDate, bill.subscription.service).vat,
    events,
  }
};

const formatCustomerBills = (customerBills, customer, number) => {
  const billedEvents = {};
  const bill = {
    customer: customer._id,
    subscriptions: [],
    billNumber: formatBillNumber(number.prefix, number.seq),
  };

  for (const draftBill of customerBills.bills) {
    bill.subscriptions.push(formatSubscriptionData(draftBill));
    for (const ev of draftBill.eventsList) {
      billedEvents[ev.event] = { ...ev };
    }
  }

  return { bill, billedEvents };
};

const formatThirdPartyPayerBills = (thirdPartyPayerBills, customer, number) => {
  let { seq } = number;
  const tppBills = [];
  const billedEvents = {};
  const fundingHistories = {};
  for (const tpp of thirdPartyPayerBills) {
    const tppBill = {
      customer: customer._id,
      client: tpp.bills[0].thirdPartyPayer,
      subscriptions: [],
    };
    if (!tpp.bills[0].externalBilling) {
      tppBill.billNumber = formatBillNumber(number.prefix, seq);
      seq += 1;
    }

    for (const draftBill of tpp.bills) {
      tppBill.subscriptions.push(formatSubscriptionData(draftBill));
      for (const ev of draftBill.eventsList) {
        billedEvents[ev.event] = { ...ev };
        if (!fundingHistories[ev.history.fundingVersion]) fundingHistories[ev.history.fundingVersion] = ev.history;
        else {
          if (fundingHistories[ev.history.fundingVersion].careHours) fundingHistories[ev.history.fundingVersion].careHours += ev.history.careHours;
          else if (fundingHistories[ev.history.fundingVersion].amountTTC) fundingHistories[ev.history.fundingVersion].amountTTC += ev.history.amountTTC;
        }
      }
    }
    tppBills.push(tppBill);
  }

  return { tppBills, billedEvents, fundingHistories };
};

const updateEvents = async (eventsToUpdate) => {
  const promises = [];
  for (const id of Object.keys(eventsToUpdate)) {
    promises.push(Event.findOneAndUpdate({ _id: id }, { $set: { isBilled: true, bills: eventsToUpdate[id] } }));
  }
  await Promise.all(promises);
};

const updateFundingHistories = async (histories) => {
  const promises = [];
  for (const id of Object.keys(histories)) {
    if (histories[id].careHours) promises.push(FundingHistory.findOneAndUpdate(
      { fundingVersion: id },
      { $inc: { careHours: histories[id].careHours } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ));
    else if (histories[id].amountTTC) promises.push(FundingHistory.findOneAndUpdate(
      { fundingVersion: id },
      { $inc: { amountTTC: histories[id].amountTTC } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ));
  }
  await Promise.all(promises);
};

const formatAndCreateBills = async (number, groupByCustomerBills) => {
  const promises = [];
  let eventsToUpdate = {};
  let fundingHistories = {};

  for (const draftBills of groupByCustomerBills) {
    const customerBillingInfo = formatCustomerBills(draftBills.customerBills, draftBills.customer, number);
    eventsToUpdate = { ...eventsToUpdate, ...customerBillingInfo.billedEvents };
    number.seq += 1;
    promises.push((new Bill(customerBillingInfo.bill)).save());

    if (draftBills.thirdPartyPayerBills && draftBills.thirdPartyPayerBills.length > 0) {
      const tppBillingInfo = formatThirdPartyPayerBills(draftBills.thirdPartyPayerBills, draftBills.customer, number);
      fundingHistories = { ...fundingHistories, ...tppBillingInfo.fundingHistories }

      eventsToUpdate = { ...eventsToUpdate, ...tppBillingInfo.billedEvents };
      for (const bill of tppBillingInfo.tppBills) {
        promises.push((new Bill(bill)).save());
        number.seq += 1;
      }
    }
  }

  await BillNumber.findOneAndUpdate({ prefix: number.prefix }, { $set: { seq: number.seq } });
  await updateFundingHistories(fundingHistories);
  await updateEvents(eventsToUpdate);
  await Promise.all(promises);
};

module.exports = {
  formatAndCreateBills,
  formatBillNumber,
  formatCustomerBills,
  formatThirdPartyPayerBills,
};
