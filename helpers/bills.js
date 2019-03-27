const moment = require('moment-business-days');
const Holidays = require('date-holidays');

const Surcharge = require('../models/Surcharge');

const holidays = new Holidays('FR');
const date = new Date();
const currentYear = date.getFullYear();
const currentHolidays = [...holidays.getHolidays(currentYear), ...holidays.getHolidays(currentYear - 1)];
moment.updateLocale('fr', {
  holidays: currentHolidays.map(holiday => holiday.date),
  holidayFormat: 'YYYY-MM-DD HH:mm:ss',
  workingWeekdays: [1, 2, 3, 4, 5, 6]
});


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

const getMatchingVersion = (date, obj) => {
  if (obj.versions.length === 1) return { ...obj, ...obj.versions[0] };

  let matchingVersion = obj.versions[0];
  for (let i = 1, l = obj.versions.length; i < l; i++) {
    if (moment(obj.versions[i].startDate).isAfter(date, 'd')) break;
    else {
      matchingVersion = obj.versions[i];
    };
  }

  return { ...obj, ...matchingVersion };
}

// TODO : Add surcharge for public holidays, evenings and customs
const applySurcharge = (event, price, surcharge) => {
  if (surcharge.saturday && surcharge.saturday > 0 && moment(event.startDate).isoWeekday() === 6) return price * (1 + surcharge.saturday / 100);
  if (surcharge.sunday && surcharge.sunday > 0 && moment(event.startDate).isoWeekday() === 7) return price * (1 + surcharge.sunday / 100);
  if (surcharge.twentyFifthOfDecember && surcharge.twentyFifthOfDecember > 0 && moment(event.startDate).format('DD/MM') === '25/12') {
    return price * (1 + surcharge.twentyFifthOfDecember / 100);
  }
  if (surcharge.firstOfMay && surcharge.firstOfMay > 0 && moment(event.startDate).format('DD/MM') === '01/05') {
    return price * (1 + surcharge.firstOfMay / 100);
  }
  if (surcharge.publicHoliday && surcharge.publicHoliday > 0 && moment(moment(event.startDate).format('YYYY-MM-DD')).isHoliday()) {
    return price * (1 + surcharge.publicHoliday / 100);
  }

  return price;
}

const getPreTaxPrice = (subscription, service) => {
  return subscription.unitTTCRate / (1 + service.vat / 100);
}

// TODO : Add funding case
const getEventPrice = (event, subscription, service) => {
  const unitPreTaxPrice = getPreTaxPrice(subscription, service);
  let price = moment(event.endDate).diff(moment(event.startDate), 'm') / 60 * unitPreTaxPrice;

  if (service.surcharge) {
    price = applySurcharge(event, price, service.surcharge)
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
      const matchingService = getMatchingVersion(event.startDate, subscription.service);
      const matchingSub = getMatchingVersion(event.startDate, subscription);

      eventsList.push(event._id.toHexString());
      minutes += moment(event.endDate).diff(moment(event.startDate), 'm');
      preTaxPrice += getEventPrice(event, matchingSub, matchingService);
      withTaxPrice = preTaxPrice;
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
    unitPreTaxPrice: getPreTaxPrice(getMatchingVersion(query.startDate, subscription), getMatchingVersion(query.startDate, subscription.service)),
    preTaxPrice,
    withTaxPrice,
  };
}

const getDraftBillsList = async (eventsToBill, query) => {
  const draftBills = [];
  for (let i = 0, l = eventsToBill.length; i < l; i++) {
    const subscription = await getSubscription(eventsToBill[i]);
    draftBills.push(getDraftBill(eventsToBill[i].events, eventsToBill[i].customer[0], subscription, query));
  }

  return draftBills;
};

module.exports = {
  getDraftBillsList,
};