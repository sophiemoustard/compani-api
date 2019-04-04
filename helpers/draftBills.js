const moment = require('moment-business-days');
const Holidays = require('date-holidays');
const _ = require('lodash');

const Surcharge = require('../models/Surcharge');
const ThirdPartyPayer = require('../models/ThirdPartyPayer');
const FundingHistory = require('../models/FundingHistory');
const { HOURLY } = require('./constants');

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

const populateFundings = async (fundings) => {
  for (let i = 0, l = fundings.length; i < l; i++) {
    const tpp = await ThirdPartyPayer.findOne({ _id: fundings[i].thirdPartyPayer }).lean();
    if (tpp) fundings[i].thirdPartyPayer = tpp;

    for (let k = 0, m = fundings[i].versions.length; k < m; k++) {
      const history = await FundingHistory.findOne({ fundingVersion: fundings[i].versions[k]._id }).lean();
      if (history) fundings[i].versions[k].history = history;
      else {
        fundings[i].versions[k].history = { careHours: 0, amountTTC: 0, fundingVersion: fundings[i].versions[k]._id };
      }
    }
  }

  return fundings;
};

// `obj` should by sort in descending order
const getMatchingVersion = (date, obj) => {
  if (obj.versions.length === 1) {
    return {
      ..._.omit(obj, 'versions'),
      ..._.omit(obj.versions[0], ['_id', 'createdAt']),
      versionId: obj.versions[0]._id
    };
  }

  const matchingVersion = obj.versions
    .filter(ver => moment(ver.startDate).isSameOrBefore(date, 'd') && (!ver.endDate || moment(ver.endDate).isSameOrAfter(date, 'd')))[0];
  if (!matchingVersion) return null;

  return { ..._.omit(obj, 'versions'), ..._.omit(matchingVersion, ['_id', 'createdAt']), versionId: matchingVersion._id };
};

const getMatchingFunding = (date, fundings) => {
  for (const funding of fundings) {
    const matchingVersion = getMatchingVersion(date, funding);
    if (matchingVersion && (matchingVersion.careDays.includes(moment(date).day() - 1) ||
      (matchingVersion.careDays.includes(7) && moment(date).isHoliday()))) {
      return matchingVersion;
    }
  }

  return null;
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

const getExclTaxes = (inclTaxes, vat) => inclTaxes / (1 + (vat / 100));

const getInclTaxes = (exclTaxes, vat) => exclTaxes * (1 + (vat / 100));

const getThirdPartyPayerPrice = (time, fundingexclTaxes, customerParticipationRate) =>
  (time / 60) * fundingexclTaxes * (1 - (customerParticipationRate / 100));

const getHourlyFundingSplit = (event, funding, service, price) => {
  let thirdPartyPayerPrice = 0;
  const time = moment(event.endDate).diff(moment(event.startDate), 'm');
  const fundingexclTaxes = getExclTaxes(funding.unitTTCRate, service.vat);

  let chargedTime = 0;
  if (funding.history.careHours < funding.careHours) {
    chargedTime = (funding.history.careHours + (time / 60) > funding.careHours)
      ? (funding.careHours - funding.history.careHours) * 60
      : time;
    thirdPartyPayerPrice = getThirdPartyPayerPrice(chargedTime, fundingexclTaxes, funding.customerParticipationRate);
    funding.history.careHours = chargedTime / 60;
  }

  return {
    customerPrice: price - thirdPartyPayerPrice,
    thirdPartyPayerPrice,
    history: funding.history,
    thirdPartyPayer: funding.thirdPartyPayer._id,
    chargedTime,
  };
};

const getFixedFundingSplit = (funding, service, price) => {
  let thirdPartyPayerPrice = 0;
  if (funding.history && funding.history.amountTTC < funding.amountTTC) {
    if (funding.history.amountTTC + (price * (1 + (service.vat / 100))) < funding.amountTTC) {
      thirdPartyPayerPrice = price;
      funding.history.amountTTC += thirdPartyPayerPrice * (1 + (service.vat / 100));
    } else {
      thirdPartyPayerPrice = getExclTaxes(funding.amountTTC - funding.history.amountTTC, service.vat);
      funding.history.amountTTC = funding.amountTTC;
    }
  }

  return {
    customerPrice: price - thirdPartyPayerPrice,
    thirdPartyPayerPrice,
    history: funding.history,
    thirdPartyPayer: funding.thirdPartyPayer._id,
  };
};

const getEventPrice = (event, subscription, service, funding) => {
  const unitExclTaxes = getExclTaxes(subscription.unitTTCRate, service.vat);
  let price = (moment(event.endDate).diff(moment(event.startDate), 'm') / 60) * unitExclTaxes;

  if (service.surcharge && service.nature === HOURLY) price = applySurcharge(event, price, service.surcharge);

  if (funding) {
    if (funding.nature === HOURLY) return getHourlyFundingSplit(event, funding, service, price);

    return getFixedFundingSplit(funding, service, price);
  }

  return { customerPrice: price, thirdPartyPayerPrice: 0 };
};

const formatDraftBillsForCustomer = (customerPrices, event, eventPrice, service) => {
  const inclTaxesCustomer = getInclTaxes(eventPrice.customerPrice, service.vat);
  const prices = { event: event._id, inclTaxesCustomer, exclTaxesCustomer: eventPrice.customerPrice };
  if (eventPrice.thirdPartyPayerPrice && event.thirdPartyPayerPrice !== 0) {
    prices.inclTaxesTpp = getInclTaxes(eventPrice.thirdPartyPayerPrice, service.vat);
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

const formatDraftBillsForTPP = (tppPrices, tpp, event, eventPrice, service) => {
  if (!tppPrices[tpp._id]) {
    tppPrices[tpp._id] = { exclTaxes: 0, inclTaxes: 0, hours: 0, eventsList: [] };
  }

  const inclTaxesTpp = getInclTaxes(eventPrice.thirdPartyPayerPrice, service.vat);
  const prices = {
    event: event._id,
    inclTaxesTpp,
    exclTaxesTpp: eventPrice.thirdPartyPayerPrice,
    thirdPartyPayer: eventPrice.thirdPartyPayer,
    inclTaxesCustomer: getInclTaxes(eventPrice.customerPrice, service.vat),
    exclTaxesCustomer: eventPrice.customerPrice,
    history: { ...eventPrice.history },
  };

  return {
    ...tppPrices,
    [tpp._id]: {
      exclTaxes: tppPrices[tpp._id].exclTaxes + eventPrice.thirdPartyPayerPrice,
      inclTaxes: tppPrices[tpp._id].inclTaxes + getInclTaxes(eventPrice.thirdPartyPayerPrice, service.vat),
      hours: tppPrices[tpp._id].hours + eventPrice.chargedTime / 60,
      eventsList: [...tppPrices[tpp._id].eventsList, { ...prices }],
    },
  };
};

const getDraftBillsPerSubscription = (events, customer, subscription, fundings, query) => {
  let customerPrices = { exclTaxes: 0, inclTaxes: 0, hours: 0, eventsList: [] };
  let thirdPartyPayerPrices = {};
  let startDate = moment(query.startDate);
  for (const event of events) {
    const matchingService = getMatchingVersion(event.startDate, subscription.service);
    const matchingSub = getMatchingVersion(event.startDate, subscription);
    const matchingFunding = fundings && fundings.length > 0 ? getMatchingFunding(event.startDate, fundings) : null;
    const eventPrice = getEventPrice(event, matchingSub, matchingService, matchingFunding);

    if (eventPrice.customerPrice) customerPrices = formatDraftBillsForCustomer(customerPrices, event, eventPrice, matchingService);
    if (matchingFunding && eventPrice.thirdPartyPayerPrice) {
      thirdPartyPayerPrices = formatDraftBillsForTPP(thirdPartyPayerPrices, matchingFunding.thirdPartyPayer, event, eventPrice, matchingService);
    }
    if (moment(event.startDate).isBefore(startDate)) startDate = moment(event.startDate);
  }

  const draftBillInfo = {
    subscription,
    identity: customer.identity,
    discount: 0,
    startDate: startDate.toDate(),
    endDate: moment(query.endDate, 'YYYYMMDD').toDate(),
    unitExclTaxes: getExclTaxes(
      getMatchingVersion(query.startDate, subscription).unitTTCRate,
      getMatchingVersion(query.startDate, subscription.service).vat
    ),
  };

  if (!fundings || Object.keys(thirdPartyPayerPrices).length === 0) return { customer: { ...draftBillInfo, ...customerPrices } };

  Object.keys(thirdPartyPayerPrices).map((key) => {
    thirdPartyPayerPrices[key] = {
      ...draftBillInfo,
      ...thirdPartyPayerPrices[key],
      thirdPartyPayer: fundings.find(fund => fund.thirdPartyPayer._id.toHexString() === key).thirdPartyPayer,
    };
  });

  return {
    customer: { ...draftBillInfo, ...customerPrices },
    thirdPartyPayer: thirdPartyPayerPrices,
  };
};

const getDraftBillsList = async (eventsToBill, query) => {
  const draftBillsList = [];
  for (let i = 0, l = eventsToBill.length; i < l; i++) {
    const customerDraftBills = [];
    const thirdPartyPayerBills = {};
    const { customer, eventsBySubscriptions } = eventsToBill[i];
    for (let k = 0, L = eventsBySubscriptions.length; k < L; k++) {
      const subscription = await populateSurcharge(eventsBySubscriptions[k].subscription);
      let { fundings } = eventsBySubscriptions[k];
      fundings = await populateFundings(fundings);

      const draftBills = getDraftBillsPerSubscription(eventsBySubscriptions[k].events, customer, subscription, fundings, query);
      customerDraftBills.push(draftBills.customer);
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
          total: bills.reduce((sum, b) => sum + (b.inclTaxes || 0), 0)
        });
      }
    }

    draftBillsList.push(groupedByCustomerBills);
  }

  return draftBillsList;
};

module.exports = {
  getDraftBillsList,
};
