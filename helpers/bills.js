const Event = require('../models/Event');
const Bill = require('../models/Bill');
const BillNumber = require('../models/BillNumber');

const formatBillNumber = (prefix, seq) => `${prefix}-${seq.toString().padStart(3, '0')}`;

const formatCustomerBills = (customerBills, customer, number) => {
  const billedEvents = {};
  const bill = {
    customer: customer._id,
    subscriptions: [],
    billNumber: formatBillNumber(number.prefix, number.seq),
  };

  for (const draftBill of customerBills.bills) {
    const events = draftBill.eventsList.map(ev => ev.event);
    bill.subscriptions.push({
      ...draftBill,
      subscription: draftBill.subscription._id,
      events,
    });
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
  for (const tpp of thirdPartyPayerBills) {
    const tppBill = {
      customer: customer._id,
      client: tpp.bills[0].thirdPartyPayer,
      subscriptions: [],
      billNumber: formatBillNumber(number.prefix, seq),
    };
    seq += 1;

    for (const draftBill of tpp.bills) {
      const events = draftBill.eventsList.map(ev => ev.event);
      tppBill.subscriptions.push({
        ...draftBill,
        subscription: draftBill.subscription._id,
        events,
      });
      for (const ev of draftBill.eventsList) {
        billedEvents[ev.event] = { ...ev };
      }
    }
    tppBills.push(tppBill);
  }

  return { tppBills, billedEvents };
};

const updateEvents = async (eventsToUpdate) => {
  const promises = [];
  for (const id of Object.keys(eventsToUpdate)) {
    promises.push(Event.findOneAndUpdate({ _id: id }, { $set: { isBilled: true, bills: eventsToUpdate[id] } }));
  }
  await Promise.all(promises);
};

const formatAndCreateBills = async (number, groupByCustomerBills) => {
  const promises = [];
  let eventsToUpdate = {};

  for (const draftBills of groupByCustomerBills) {
    const customerBillingInfo = formatCustomerBills(draftBills.customerBills, draftBills.customer, number);
    eventsToUpdate = { ...eventsToUpdate, ...customerBillingInfo.billedEvents };
    number.seq += 1;
    promises.push((new Bill(customerBillingInfo.bill)).save());

    if (draftBills.thirdPartyPayerBills && draftBills.thirdPartyPayerBills.length > 0) {
      const tppBillingInfo = formatThirdPartyPayerBills(draftBills.thirdPartyPayerBills, draftBills.customer, number);

      eventsToUpdate = { ...eventsToUpdate, ...tppBillingInfo.billedEvents };
      for (const bill of tppBillingInfo.tppBills) {
        promises.push((new Bill(bill)).save());
        number.seq += 1;
      }
    }
  }

  await BillNumber.findOneAndUpdate({ prefix: number.prefix }, { $set: { seq: number.seq } });
  await updateEvents(eventsToUpdate);
  await Promise.all(promises);
};

module.exports = {
  formatAndCreateBills
};
