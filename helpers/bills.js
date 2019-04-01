const moment = require('moment-business-days');
const Holidays = require('date-holidays');

const Surcharge = require('../models/Surcharge');
const { HOURLY } = require('../helpers/constants');

const holidays = new Holidays('FR');
const now = new Date();
const currentYear = now.getFullYear();
const currentHolidays = [...holidays.getHolidays(currentYear), ...holidays.getHolidays(currentYear - 1)];
moment.updateLocale('fr', {
  holidays: currentHolidays.map(holiday => holiday.date),
  holidayFormat: 'YYYY-MM-DD HH:mm:ss',
  workingWeekdays: [1, 2, 3, 4, 5, 6]
});

const populateSurcharge = async (subscription) => {
  for (let i = 0, l = subscription.service.versions.length; i < l; i++) {
    if (subscription.service.versions[i].surcharge) {
      const surcharge = await Surcharge.findOne({ _id: subscription.service.versions[i].surcharge });
      subscription.service.versions[i] = { ...subscription.service.versions[i], surcharge };
    }
  }

  return {
    ...subscription,
    versions: subscription.versions.sort((a, b) => b.startDate - a.startDate),
    service: {
      ...subscription.service,
      versions: subscription.service.versions.sort((a, b) => b.startDate - a.startDate),
    },
  };
};

// `obj` should by sort in descending order
const getMatchingVersion = (date, obj) => {
  if (obj.versions.length === 1) return { ...obj, ...obj.versions[0] };

  const matchingVersion = obj.versions.filter(ver => moment(ver.startDate).isSameOrBefore(date, 'd'))[0];

  return { ...obj, ...matchingVersion };
};

const computeCustomSurcharge = (event, startHour, endHour, surchargeValue, price) => {
  const start = moment(event.startDate).hour(startHour.substring(0, 2)).minute(startHour.substring(2));
  let end = moment(event.startDate).hour(endHour.substring(0, 2)).minute(endHour.substring(2));
  if (start.isAfter(end)) end = end.add(1, 'd');

  if (start.isSameOrBefore(event.startDate) && end.isSameOrAfter(event.endDate)) return price * (1 + (surchargeValue / 100));

  const time = moment(event.endDate).diff(moment(event.startDate), 'm');
  let inflatedTime = 0;
  let notInflatedTime = time;
  if (start.isSameOrBefore(event.startDate) && end.isAfter(event.startDate) && end.isBefore(event.endDate)) {
    inflatedTime = end.diff(event.startDate, 'm');
    notInflatedTime = moment(event.endDate).diff(end, 'm');
  } else if (start.isAfter(event.startDate) && start.isBefore(event.endDate) && end.isSameOrAfter(event.endDate)) {
    inflatedTime = moment(event.endDate).diff(start, 'm');
    notInflatedTime = start.diff(event.startDate, 'm');
  } else if (start.isAfter(event.startDate) && end.isBefore(event.endDate)) {
    inflatedTime = end.diff(start, 'm');
    notInflatedTime = start.diff(event.startDate, 'm') + moment(event.endDate).diff(end, 'm');
  }

  return (price / time) * (notInflatedTime + (inflatedTime * (1 + (surchargeValue / 100))));
};

const applySurcharge = (event, price, surcharge) => {
  const {
    saturday,
    sunday,
    publicHoliday,
    firstOfMay,
    twentyFifthOfDecember,
    evening,
    eveningEndTime,
    eveningStartTime,
    custom,
    customStartTime,
    customEndTime
  } = surcharge;

  if (twentyFifthOfDecember && twentyFifthOfDecember > 0 && moment(event.startDate).format('DD/MM') === '25/12') {
    return price * (1 + (twentyFifthOfDecember / 100));
  }
  if (firstOfMay && firstOfMay > 0 && moment(event.startDate).format('DD/MM') === '01/05') return price * (1 + (firstOfMay / 100));
  if (publicHoliday && publicHoliday > 0 && moment(moment(event.startDate).format('YYYY-MM-DD')).isHoliday()) {
    return price * (1 + (publicHoliday / 100));
  }
  if (saturday && saturday > 0 && moment(event.startDate).isoWeekday() === 6) return price * (1 + (saturday / 100));
  if (sunday && sunday > 0 && moment(event.startDate).isoWeekday() === 7) return price * (1 + (sunday / 100));
  if (evening) return computeCustomSurcharge(event, eveningStartTime, eveningEndTime, evening, price);
  if (custom) return computeCustomSurcharge(event, customStartTime, customEndTime, custom, price);

  return price;
};

const getPreTaxPrice = (subscription, service) => subscription.unitTTCRate / (1 + (service.vat / 100));

const getEventPrice = (event, subscription, service) => {
  const unitPreTaxPrice = getPreTaxPrice(subscription, service);
  let price = (moment(event.endDate).diff(moment(event.startDate), 'm') / 60) * unitPreTaxPrice;

  if (service.surcharge && service.nature === HOURLY) price = applySurcharge(event, price, service.surcharge);

  return price;
};

const getDraftBill = (events, customer, subscription, query) => {
  const eventsList = [];
  let minutes = 0;
  let preTaxPrice = 0;
  let withTaxPrice = 0;
  let startDate = moment(query.startDate);
  for (const event of events) {
    if (!eventsList.includes(event._id.toHexString())) {
      const matchingService = getMatchingVersion(event.startDate, subscription.service);
      const matchingSub = getMatchingVersion(event.startDate, subscription);

      eventsList.push(event._id.toHexString());
      minutes += moment(event.endDate).diff(moment(event.startDate), 'm');

      const eventPrice = getEventPrice(event, matchingSub, matchingService);
      preTaxPrice += eventPrice;
      withTaxPrice += eventPrice * (1 + (matchingService.vat / 100));
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
};

const getDraftBillsList = async (eventsToBill, query) => {
  const draftBills = [];
  for (let i = 0, l = eventsToBill.length; i < l; i++) {
    const eventsListGroupByCustomer = eventsToBill[i].eventsBySubscriptions;
    const customerDraftBills = [];
    for (let k = 0, L = eventsListGroupByCustomer.length; k < L; k++) {
      const subscription = await populateSurcharge(eventsListGroupByCustomer[k].subscription);
      customerDraftBills.push(getDraftBill(eventsListGroupByCustomer[k].events, eventsToBill[i].customer, subscription, query));
    }
    draftBills.push({
      customer: eventsToBill[i].customer,
      bills: customerDraftBills,
      total: customerDraftBills.reduce((sum, b) => sum + (b.withTaxPrice || 0), 0)
    });
  }

  return draftBills;
};

module.exports = {
  getDraftBillsList,
};
