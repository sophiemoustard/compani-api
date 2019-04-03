const Event = require('../models/Event');
const Bill = require('../models/Bill');
const BillNumber = require('../models/BillNumber');

const getBillNumber = (prefix, seq) => `${prefix}-${seq.toString().padStart(3, '0')}`;

const formatCustomerBills = (customerBills, customer, number) => {
  const billedEvents = [];
  const bill = {
    customer: customer._id,
    subscriptions: [],
    billNumber: getBillNumber(number.prefix, number.seq),
  };

  for (const draftBill of customerBills.bills) {
    const events = draftBill.eventsList.map(ev => ev.event);
    bill.subscriptions.push({
      ...draftBill,
      subscription: draftBill.subscription._id,
      events,
    });
    billedEvents.push(...events);
  }

  return { bill, billedEvents };
};

const formatThirdPartyPayerBills = (thirdPartyPayerBills, customer, number) => {
  let { seq } = number;
  const tppBills = [];
  const billedEvents = [];
  for (const tpp of thirdPartyPayerBills) {
    const tppBill = {
      customer: customer._id,
      client: tpp.bills[0].thirdPartyPayer,
      subscriptions: [],
      billNumber: getBillNumber(number.prefix, seq),
    };
    seq += 1;

    for (const draftBill of tpp.bills) {
      tppBill.subscriptions.push({
        ...draftBill,
        subscription: draftBill.subscription._id,
        events: draftBill.eventsList,
      });
      billedEvents.push(...draftBill.eventsList);
    }
    tppBills.push(tppBill);
  }

  return { tppBills, billedEvents };
};

const formatAndCreateBills = async (number, groupByCustomerBills) => {
  const promises = [];
  const eventsToUpdate = [];

  for (const draftBills of groupByCustomerBills) {
    const customerBillingInfo = formatCustomerBills(draftBills.customerBills, draftBills.customer, number);
    eventsToUpdate.push(...customerBillingInfo.billedEvents);
    number.seq += 1;
    promises.push((new Bill(customerBillingInfo.bill)).save());

    if (draftBills.thirdPartyPayerBills && draftBills.thirdPartyPayerBills.length > 0) {
      const tppBillingInfo = formatThirdPartyPayerBills(draftBills.thirdPartyPayerBills, draftBills.customer, number);

      tppBillingInfo.billedEvents.map((ev) => {
        if (!eventsToUpdate.includes(ev)) eventsToUpdate.push(ev);
      });
      for (const bill of tppBillingInfo.tppBills) {
        promises.push((new Bill(bill)).save());
        number.seq += 1;
      }
    }
  }
  console.log(eventsToUpdate);
  eventsToUpdate.map(ev => console.log(typeof ev));

  await BillNumber.findOneAndUpdate({ prefix: number.prefix }, { $set: { seq: number.seq } });
  await Event.updateMany({ _id: { $in: eventsToUpdate } }, { $set: { isBilled: true } });
  await Promise.all(promises);
};

module.exports = {
  formatAndCreateBills
};
