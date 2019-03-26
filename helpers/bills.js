const moment = require('moment');

const Surcharge = require('../models/Surcharge');

const getSubscription = async (eventsToBill) => {
  let subscription = eventsToBill.customer[0].subscriptions
    .find(s => s._id.toHexString() === eventsToBill._id.SUB.toHexString());
  const service = eventsToBill.services.find(ser => ser._id.toHexString() === subscription.service.toHexString());
  for (let i = 0, l = service.versions.length; i < l; i++) {
    if (service.versions[i].surcharge) {
      const surcharge = await Surcharge.findOne({ _id: service.versions[i].surcharge });
      service.versions[i] = { ...service.versions[i], surcharge };
    }
  }
  
  return {
    ...subscription,
    service: {
      ...service,
      versions: service.versions.sort((a, b) => a.startDate - b.startDate),
    },
  };
};

const getMatchingVersion = (event, obj) => {
  if (obj.versions.length === 1) return { ...obj, ...obj.versions[0] };

  let matchingVersion = obj.versions[0];
  for (let i = 1, l = obj.versions.length; i < l; i++) {
    if (moment(obj.versions[i].startDate).isAfter(event.startDate, 'd')) break;
    else {
      matchingVersion = obj.versions[i];
    };
  }

  return { ...obj, ...matchingVersion };
}

// TODO : Add surcharge for public holidays, evenings and customs
const applySurcharge = (event, price, surcharge) => {
  if (surcharge.saturday && moment(event.startDate).isoWeekday() === 6) return price * (1 + surcharge.saturday / 100);
  if (surcharge.sunday && moment(event.startDate).isoWeekday() === 7) return price * (1 + surcharge.sunday / 100);
  if (surcharge.twentyFifthOfDecember && moment(event.startDate).format('DD/MM') === '25/12') {
    return price * (1 + surcharge.twentyFifthOfDecember / 100);
  }
  if (surcharge.firstOfMay && moment(event.startDate).format('DD/MM') === '01/05') return price * (1 + surcharge.firstOfMay / 100);

  return price;
}

// TODO : Add funding case
const getEventPrice = (event, subscription, service, fundings) => {
  let price = moment(event.endDate).diff(moment(event.startDate), 'm') / 60 * subscription.versions[0].unitTTCRate;

  if (service.surcharge) {
    price = applySurcharge(event, price, service.surcharge)
  }

  if (fundings) {

  }
  
  return price;
}

// TODO : check what to do in case of no vat
const getDraftBill = (events, customer, subscription, query) => {
  const eventsList = [];
  let minutes = 0;
  let preTaxPrice = 0;
  let startDate = moment(query.startDate);
  for (const event of events) {
    if (!eventsList.includes(event._id.toHexString())) {
      const matchingService = getMatchingVersion(event, subscription.service);
      const matchingSub = getMatchingVersion(event, subscription);

      eventsList.push(event._id.toHexString());
      minutes += moment(event.endDate).diff(moment(event.startDate), 'm');
      preTaxPrice += getEventPrice(event, matchingSub, matchingService, customer.fundings);
      withTaxPrice = matchingService.vat ? preTaxPrice * (1 + matchingService.vat / 100) : preTaxPrice;
      if (moment(event.startDate).isBefore(startDate)) startDate = moment(event.startDate);
    }
  }

  return {
    hours: minutes / 60,
    eventsList,
    subscription,
    identity: customer.identity,
    discount: 0,
    startDate: startDate.toDate(),
    endDate: moment(query.endDate, 'YYYYMMDD').toDate(),
    unitPreTaxPrice: preTaxPrice * 60 / minutes,
    preTaxPrice,
    withTaxPrice,
  };
}

const getDraftBillsList = async (eventsToBill, query) => {
  const draftBills = [];
  for (let i = 0, l = eventsToBill.length; i < l; i++) {
    const subscription = await getSubscription(eventsToBill[i]);
    console.log(eventsToBill[i].customer[0].fundings, subscription._id);
    const funding = eventsToBill[i].customer[0].fundings.filter(fund => fund.subscription === subscription._id.toHexString())
    draftBills.push(getDraftBill(eventsToBill[i].events, eventsToBill[i].customer[0], subscription, query));
  }

  return draftBills;
};

module.exports = {
  getDraftBillsList,
};