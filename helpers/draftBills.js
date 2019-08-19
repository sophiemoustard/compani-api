const moment = require('moment-business-days');
const Holidays = require('date-holidays');
const mongoose = require('mongoose');
const EventRepository = require('../repositories/EventRepository');
const Surcharge = require('../models/Surcharge');
const ThirdPartyPayer = require('../models/ThirdPartyPayer');
const FundingHistory = require('../models/FundingHistory');
const { HOURLY, MONTHLY, ONCE, FIXED } = require('./constants');
const utils = require('../helpers/utils');

const holidays = new Holidays('FR');
const now = new Date();
const currentYear = now.getFullYear();
const currentHolidays = [...holidays.getHolidays(currentYear), ...holidays.getHolidays(currentYear - 1)];
moment.updateLocale('fr', {
  holidays: currentHolidays.map(holiday => holiday.date),
  holidayFormat: 'YYYY-MM-DD HH:mm:ss',
  workingWeekdays: [1, 2, 3, 4, 5, 6],
});
moment.tz.setDefault('Europe/Paris');

exports.populateSurcharge = async (subscription) => {
  for (let i = 0, l = subscription.service.versions.length; i < l; i++) {
    if (subscription.service.versions[i].surcharge) {
      const surcharge = await Surcharge.findOne({ _id: subscription.service.versions[i].surcharge });
      subscription.service.versions[i] = { ...subscription.service.versions[i], surcharge };
    }
  }

  return {
    ...subscription,
    versions: [...subscription.versions].sort((a, b) => b.startDate - a.startDate),
    service: {
      ...subscription.service,
      versions: [...subscription.service.versions].sort((a, b) => b.startDate - a.startDate),
    },
  };
};

/**
 * 2 cases :
 * Funding version frequency = ONCE : there is only ONE history
 * Funding version frequency = MONTHLY : there is one history PER MONTH
 */
exports.populateFundings = async (fundings, endDate) => {
  for (let i = 0, l = fundings.length; i < l; i++) {
    fundings[i] = utils.mergeLastVersionWithBaseObject(fundings[i], 'createdAt');
    const tpp = await ThirdPartyPayer.findOne({ _id: fundings[i].thirdPartyPayer }).lean();
    if (tpp) fundings[i].thirdPartyPayer = tpp;

    if (fundings[i].frequency !== MONTHLY) {
      const history = await FundingHistory.findOne({ fundingId: fundings[i]._id }).lean();
      if (history) fundings[i].history = history;
      else {
        fundings[i].history = { careHours: 0, amountTTC: 0, fundingId: fundings[i]._id };
      }
    } else {
      const history = await FundingHistory.find({ fundingId: fundings[i]._id });
      if (history) fundings[i].history = history;
      if (history.length === 0 || !history) fundings[i].history = [];
      if (!history.some(his => his.month === moment(endDate).format('MM/YYYY'))) {
        fundings[i].history.push({
          careHours: 0,
          amountTTC: 0,
          fundingId: fundings[i]._id,
          month: moment(endDate).format('MM/YYYY'),
        });
      }
    }
  }
  return fundings;
};

exports.getMatchingFunding = (date, fundings) => {
  const filteredByDateFundings = fundings.filter(fund => moment(fund.startDate).isSameOrBefore(date));
  if (moment(date).startOf('d').isHoliday()) return filteredByDateFundings.find(funding => funding.careDays.includes(7)) || null;

  return filteredByDateFundings.find(funding => funding.careDays.includes(moment(date).isoWeekday() - 1)) || null;
};

exports.computeCustomSurcharge = (event, startHour, endHour, surchargeValue, price) => {
  const start = moment(event.startDate).hour(startHour.substring(0, 2)).minute(startHour.substring(3));
  let end = moment(event.startDate).hour(endHour.substring(0, 2)).minute(endHour.substring(3));
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

exports.applySurcharge = (event, price, surcharge) => {
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
    customEndTime,
  } = surcharge;

  if (twentyFifthOfDecember && twentyFifthOfDecember > 0 && moment(event.startDate).format('DD/MM') === '25/12') {
    return price * (1 + (twentyFifthOfDecember / 100));
  }
  if (firstOfMay && firstOfMay > 0 && moment(event.startDate).format('DD/MM') === '01/05') return price * (1 + (firstOfMay / 100));
  if (publicHoliday && publicHoliday > 0 && moment(event.startDate).startOf('d').isHoliday()) {
    return price * (1 + (publicHoliday / 100));
  }
  if (saturday && saturday > 0 && moment(event.startDate).isoWeekday() === 6) return price * (1 + (saturday / 100));
  if (sunday && sunday > 0 && moment(event.startDate).isoWeekday() === 7) return price * (1 + (sunday / 100));

  let surchargedPrice = price;
  if (evening) surchargedPrice = exports.computeCustomSurcharge(event, eveningStartTime, eveningEndTime, evening, surchargedPrice);
  if (custom) surchargedPrice = exports.computeCustomSurcharge(event, customStartTime, customEndTime, custom, surchargedPrice);

  return surchargedPrice;
};

exports.getExclTaxes = (inclTaxes, vat) => inclTaxes / (1 + (vat / 100));

exports.getInclTaxes = (exclTaxes, vat) => exclTaxes * (1 + (vat / 100));

exports.getThirdPartyPayerPrice = (time, fundingExclTaxes, customerParticipationRate) =>
  (time / 60) * fundingExclTaxes * (1 - (customerParticipationRate / 100));

exports.getMatchingHistory = (event, funding) => {
  if (funding.frequency === ONCE) return funding.history;

  let history = funding.history.find(his => his.month === moment(event.startDate).format('MM/YYYY'));
  if (history) return history;

  funding.history.push({ careHours: 0, amountTTC: 0, fundingId: funding._id, month: moment(event.startDate).format('MM/YYYY') });
  history = funding.history.find(his => his.month === moment(event.startDate).format('MM/YYYY'));
  return history;
};

/**
 * Return prices and billing history for event linked to hourly funding.
 * @param {*} price : excluded taxes event price.
 */
exports.getHourlyFundingSplit = (event, funding, service, price) => {
  let thirdPartyPayerPrice = 0;
  const time = moment(event.endDate).diff(moment(event.startDate), 'm');
  const fundingExclTaxes = exports.getExclTaxes(funding.unitTTCRate, service.vat);
  const history = exports.getMatchingHistory(event, funding);

  let chargedTime = 0;
  if (history && history.careHours < funding.careHours) {
    chargedTime = (history.careHours + (time / 60) > funding.careHours)
      ? (funding.careHours - history.careHours) * 60
      : time;
    thirdPartyPayerPrice = exports.getThirdPartyPayerPrice(chargedTime, fundingExclTaxes, funding.customerParticipationRate);
    history.careHours = (history.careHours + (time / 60) > funding.careHours)
      ? funding.careHours
      : history.careHours + (chargedTime / 60);
  }

  return {
    customerPrice: price - thirdPartyPayerPrice,
    thirdPartyPayerPrice,
    history: {
      careHours: chargedTime / 60,
      fundingId: funding._id,
      nature: funding.nature,
      ...(funding.frequency === MONTHLY && { month: moment(event.startDate).format('MM/YYYY') }),
    },
    fundingId: funding._id,
    thirdPartyPayer: funding.thirdPartyPayer._id,
    chargedTime,
  };
};

/**
 * For a funding with a FIXED nature (frequency = ONCE), 2 cases : no history OR one global history
 * @param {*} price : excluded taxes event price.
 */
exports.getFixedFundingSplit = (event, funding, service, price) => {
  let thirdPartyPayerPrice = 0;
  if (funding.history && funding.history.amountTTC < funding.amountTTC) {
    if (funding.history.amountTTC + (price * (1 + (service.vat / 100))) < funding.amountTTC) {
      thirdPartyPayerPrice = price;
      funding.history.amountTTC += thirdPartyPayerPrice * (1 + (service.vat / 100));
    } else {
      thirdPartyPayerPrice = exports.getExclTaxes(funding.amountTTC - funding.history.amountTTC, service.vat);
      funding.history.amountTTC = funding.amountTTC;
    }
  }

  const chargedTime = moment(event.endDate).diff(moment(event.startDate), 'm');

  return {
    customerPrice: price - thirdPartyPayerPrice,
    thirdPartyPayerPrice,
    history: {
      amountTTC: thirdPartyPayerPrice * (1 + (service.vat / 100)),
      fundingId: funding._id,
      nature: funding.nature,
    },
    fundingId: funding._id,
    thirdPartyPayer: funding.thirdPartyPayer._id,
    chargedTime,
  };
};

/**
 * Returns customer and tpp excluded taxes prices of the given event.
 */
exports.getEventPrice = (event, unitTTCRate, service, funding) => {
  const unitExclTaxes = exports.getExclTaxes(unitTTCRate, service.vat);
  let price = (moment(event.endDate).diff(moment(event.startDate), 'm') / 60) * unitExclTaxes;

  if (service.nature === FIXED) price = unitExclTaxes;
  if (service.surcharge && service.nature === HOURLY) price = exports.applySurcharge(event, price, service.surcharge);

  if (funding) {
    if (funding.nature === HOURLY) return exports.getHourlyFundingSplit(event, funding, service, price);

    return exports.getFixedFundingSplit(event, funding, service, price);
  }

  return { customerPrice: price, thirdPartyPayerPrice: 0 };
};

exports.formatDraftBillsForCustomer = (customerPrices, event, eventPrice, service) => {
  const inclTaxesCustomer = exports.getInclTaxes(eventPrice.customerPrice, service.vat);
  const prices = {
    event: event._id,
    startDate: event.startDate,
    endDate: event.endDate,
    auxiliary: event.auxiliary,
    inclTaxesCustomer,
    exclTaxesCustomer: eventPrice.customerPrice,
  };
  if (eventPrice.thirdPartyPayerPrice && eventPrice.thirdPartyPayerPrice !== 0) {
    prices.inclTaxesTpp = exports.getInclTaxes(eventPrice.thirdPartyPayerPrice, service.vat);
    prices.exclTaxesTpp = eventPrice.thirdPartyPayerPrice;
    prices.thirdPartyPayer = eventPrice.thirdPartyPayer;
  }

  return {
    eventsList: [...customerPrices.eventsList, { ...prices }],
    hours: customerPrices.hours + (moment(event.endDate).diff(moment(event.startDate), 'm') / 60),
    exclTaxes: customerPrices.exclTaxes + eventPrice.customerPrice,
    inclTaxes: customerPrices.inclTaxes + inclTaxesCustomer,
  };
};

exports.formatDraftBillsForTPP = (tppPrices, tpp, event, eventPrice, service) => {
  if (!tppPrices[tpp._id]) {
    tppPrices[tpp._id] = { exclTaxes: 0, inclTaxes: 0, hours: 0, eventsList: [] };
  }

  const inclTaxesTpp = exports.getInclTaxes(eventPrice.thirdPartyPayerPrice, service.vat);
  const prices = {
    event: event._id,
    startDate: event.startDate,
    endDate: event.endDate,
    auxiliary: event.auxiliary,
    inclTaxesTpp,
    exclTaxesTpp: eventPrice.thirdPartyPayerPrice,
    thirdPartyPayer: eventPrice.thirdPartyPayer,
    inclTaxesCustomer: exports.getInclTaxes(eventPrice.customerPrice, service.vat),
    exclTaxesCustomer: eventPrice.customerPrice,
    history: { ...eventPrice.history },
    fundingId: eventPrice.fundingId,
    nature: eventPrice.history.nature,
  };

  return {
    ...tppPrices,
    [tpp._id]: {
      exclTaxes: tppPrices[tpp._id].exclTaxes + eventPrice.thirdPartyPayerPrice,
      inclTaxes: tppPrices[tpp._id].inclTaxes + exports.getInclTaxes(eventPrice.thirdPartyPayerPrice, service.vat),
      hours: tppPrices[tpp._id].hours + (eventPrice.chargedTime / 60),
      eventsList: [...tppPrices[tpp._id].eventsList, { ...prices }],
    },
  };
};

exports.getDraftBillsPerSubscription = (events, customer, subscription, fundings, billingStartDate, endDate) => {
  let customerPrices = { exclTaxes: 0, inclTaxes: 0, hours: 0, eventsList: [] };
  let thirdPartyPayerPrices = {};
  let startDate = moment(billingStartDate);
  const { unitTTCRate } = utils.getLastVersion(subscription.versions, 'createdAt');
  for (const event of events) {
    const matchingService = utils.getMatchingVersion(event.startDate, subscription.service, 'startDate');
    const matchingFunding = fundings && fundings.length > 0 ? exports.getMatchingFunding(event.startDate, fundings) : null;
    const eventPrice = exports.getEventPrice(event, unitTTCRate, matchingService, matchingFunding);

    if (eventPrice.customerPrice) customerPrices = exports.formatDraftBillsForCustomer(customerPrices, event, eventPrice, matchingService);
    if (matchingFunding && eventPrice.thirdPartyPayerPrice) {
      thirdPartyPayerPrices = exports.formatDraftBillsForTPP(thirdPartyPayerPrices, matchingFunding.thirdPartyPayer, event, eventPrice, matchingService);
    }
    if (moment(event.startDate).isBefore(startDate)) startDate = moment(event.startDate);
  }

  const serviceMatchingVersion = utils.getMatchingVersion(endDate, subscription.service, 'startDate');

  const draftBillInfo = {
    _id: mongoose.Types.ObjectId(),
    subscription,
    identity: customer.identity,
    discount: 0,
    startDate: startDate.toDate(),
    endDate: moment(endDate, 'YYYYMMDD').toDate(),
    unitExclTaxes: exports.getExclTaxes(unitTTCRate, serviceMatchingVersion.vat),
    unitInclTaxes: unitTTCRate,
    vat: serviceMatchingVersion.vat,
  };

  const result = {};
  if (customerPrices.exclTaxes !== 0) result.customer = { ...draftBillInfo, ...customerPrices };
  if (fundings && Object.keys(thirdPartyPayerPrices).length !== 0) {
    Object.keys(thirdPartyPayerPrices).map((key) => {
      thirdPartyPayerPrices[key] = {
        ...draftBillInfo,
        ...thirdPartyPayerPrices[key],
        _id: mongoose.Types.ObjectId(),
        externalBilling: false,
        thirdPartyPayer: fundings.find(fund => fund.thirdPartyPayer._id.toHexString() === key).thirdPartyPayer,
      };
    });
    result.thirdPartyPayer = thirdPartyPayerPrices;
  }

  return result;
};

exports.getDraftBillsList = async (dates, billingStartDate, customerId = null) => {
  const eventsToBill = await EventRepository.getEventsToBill(dates, customerId);
  const draftBillsList = [];
  for (let i = 0, l = eventsToBill.length; i < l; i++) {
    const customerDraftBills = [];
    const thirdPartyPayerBills = {};
    const { customer, eventsBySubscriptions } = eventsToBill[i];
    for (let k = 0, L = eventsBySubscriptions.length; k < L; k++) {
      const subscription = await exports.populateSurcharge(eventsBySubscriptions[k].subscription);
      let { fundings } = eventsBySubscriptions[k];
      fundings = fundings ? await exports.populateFundings(fundings, dates.endDate) : null;

      const draftBills = exports.getDraftBillsPerSubscription(eventsBySubscriptions[k].events, customer, subscription, fundings, billingStartDate, dates.endDate);
      if (draftBills.customer) customerDraftBills.push(draftBills.customer);
      if (draftBills.thirdPartyPayer) {
        for (const tpp of Object.keys(draftBills.thirdPartyPayer)) {
          if (!thirdPartyPayerBills[tpp]) thirdPartyPayerBills[tpp] = [draftBills.thirdPartyPayer[tpp]];
          else thirdPartyPayerBills[tpp].push(draftBills.thirdPartyPayer[tpp]);
        }
      }
    }

    const groupedByCustomerBills = {
      customerId: customer._id,
      customer,
      customerBills: {
        bills: customerDraftBills,
        total: customerDraftBills.reduce((sum, b) => sum + (b.inclTaxes || 0), 0),
      },
    };
    if (Object.values(thirdPartyPayerBills).length > 0) {
      groupedByCustomerBills.thirdPartyPayerBills = [];
      for (const bills of Object.values(thirdPartyPayerBills)) {
        groupedByCustomerBills.thirdPartyPayerBills.push({
          bills,
          total: bills.reduce((sum, b) => sum + (b.inclTaxes || 0), 0),
        });
      }
    }

    draftBillsList.push(groupedByCustomerBills);
  }

  return draftBillsList;
};
