const get = require('lodash/get');
const mergeWith = require('lodash/mergeWith');
const { ObjectID } = require('mongodb');
const moment = require('../extensions/moment');
const EventRepository = require('../repositories/EventRepository');
const BillingItem = require('../models/BillingItem');
const Surcharge = require('../models/Surcharge');
const ThirdPartyPayer = require('../models/ThirdPartyPayer');
const FundingHistory = require('../models/FundingHistory');
const { HOURLY, MONTHLY, ONCE, FIXED, BILLING_DIRECT } = require('./constants');
const UtilsHelper = require('./utils');
const SurchargesHelper = require('./surcharges');
const DatesHelper = require('./dates');

const populateSurchargeAndBillingItem = (arr, surcharges, billingItems) => arr
  .map(v => ({
    ...v,
    ...(v.surcharge && { surcharge: surcharges.find(s => UtilsHelper.areObjectIdsEquals(s._id, v.surcharge)) }),
    billingItems: v.billingItems.map(bi => billingItems.find(bddBI => UtilsHelper.areObjectIdsEquals(bddBI._id, bi))),
  }))
  .sort(DatesHelper.descendingSort('startDate'));

exports.populateAndFormatSubscription = async (subscription, surcharges, billingItems) => ({
  ...subscription,
  versions: [...subscription.versions].sort(DatesHelper.descendingSort('startDate')),
  service: {
    ...subscription.service,
    versions: populateSurchargeAndBillingItem(subscription.service.versions, surcharges, billingItems),
  },
});

/**
 * 2 cases :
 * Funding version frequency = ONCE : there is only ONE history
 * Funding version frequency = MONTHLY : there is one history PER MONTH
 */
exports.populateFundings = async (fundings, endDate, tppList, companyId) => {
  const populatedFundings = [];
  for (let i = 0, l = fundings.length; i < l; i++) {
    const funding = UtilsHelper.mergeLastVersionWithBaseObject(fundings[i], 'createdAt');
    const tpp = tppList.find(tppTmp => tppTmp._id.toHexString() === funding.thirdPartyPayer.toHexString());
    if (!tpp || tpp.billingMode !== BILLING_DIRECT) continue;

    funding.thirdPartyPayer = tpp;
    if (funding.frequency !== MONTHLY) {
      const history = await FundingHistory.findOne({ fundingId: funding._id }).lean();
      if (history) funding.history = [history];
      else funding.history = [{ careHours: 0, amountTTC: 0, fundingId: funding._id }];
    } else {
      const history = await FundingHistory.find({ fundingId: funding._id, company: companyId }).lean();
      if (history) funding.history = history;
      if (history.length === 0 || !history) funding.history = [];
      if (!history.some(his => his.month === moment(endDate).format('MM/YYYY'))) {
        funding.history.push({
          careHours: 0,
          amountTTC: 0,
          fundingId: funding._id,
          month: moment(endDate).format('MM/YYYY'),
        });
      }
    }
    populatedFundings.push(funding);
  }
  return populatedFundings;
};

exports.getMatchingFunding = (date, fundings) => {
  const filteredByDateFundings = fundings.filter(fund => moment(fund.startDate).isSameOrBefore(date) &&
    (!fund.endDate || moment(fund.endDate).isAfter(date)));
  if (moment(date).startOf('d').isHoliday()) {
    return filteredByDateFundings.find(funding => funding.careDays.includes(7)) || null;
  }

  return filteredByDateFundings.find(funding => funding.careDays.includes(moment(date).isoWeekday() - 1)) || null;
};

exports.getSurchargedPrice = (event, eventSurcharges, price) => {
  let coef = 1;
  const eventDuration = moment(event.endDate).diff(event.startDate, 'm');

  for (const surcharge of eventSurcharges) {
    if (surcharge.startHour) {
      const surchargedDuration = moment(surcharge.endHour).diff(surcharge.startHour, 'm');
      coef += (surchargedDuration / eventDuration) * (surcharge.percentage / 100);
    } else {
      coef += surcharge.percentage / 100;
    }
  }

  return coef * price;
};

exports.getExclTaxes = (inclTaxes, vat) => (vat ? inclTaxes / (1 + (vat / 100)) : inclTaxes);

exports.getInclTaxes = (exclTaxes, vat) => (vat ? exclTaxes * (1 + (vat / 100)) : exclTaxes);

exports.getThirdPartyPayerPrice = (time, fundingExclTaxes, customerParticipationRate) =>
  (time / 60) * fundingExclTaxes * (1 - (customerParticipationRate / 100));

exports.getMatchingHistory = (event, funding) => {
  if (funding.frequency === ONCE) return funding.history[0];

  let history = funding.history.find(his => his.month === moment(event.startDate).format('MM/YYYY'));
  if (history) return history;

  funding.history.push({
    careHours: 0,
    amountTTC: 0,
    fundingId: funding._id,
    month: moment(event.startDate).format('MM/YYYY'),
  });
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
    thirdPartyPayerPrice = exports.getThirdPartyPayerPrice(
      chargedTime,
      fundingExclTaxes,
      funding.customerParticipationRate
    );
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
  if (funding.history && funding.history[0].amountTTC < funding.amountTTC) {
    const history = funding.history[0];
    if (history.amountTTC + (price * (1 + (service.vat / 100))) < funding.amountTTC) {
      thirdPartyPayerPrice = price;
      history.amountTTC += thirdPartyPayerPrice * (1 + (service.vat / 100));
    } else {
      thirdPartyPayerPrice = exports.getExclTaxes(funding.amountTTC - history.amountTTC, service.vat);
      history.amountTTC = funding.amountTTC;
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
exports.getEventBilling = (event, unitTTCRate, service, funding) => {
  const unitExclTaxes = exports.getExclTaxes(unitTTCRate, service.vat);
  let price = (moment(event.endDate).diff(moment(event.startDate), 'm') / 60) * unitExclTaxes;
  const billing = {};

  if (service.nature === FIXED) price = unitExclTaxes;
  if (service.surcharge && service.nature === HOURLY) {
    const surcharges = SurchargesHelper.getEventSurcharges(event, service.surcharge);
    if (surcharges.length > 0) {
      billing.surcharges = surcharges;
      price = exports.getSurchargedPrice(event, surcharges, price);
    }
  }

  if (funding) {
    let fundingBilling;
    if (funding.nature === HOURLY) fundingBilling = exports.getHourlyFundingSplit(event, funding, service, price);
    else fundingBilling = exports.getFixedFundingSplit(event, funding, service, price);

    return { ...billing, ...fundingBilling };
  }

  return { ...billing, customerPrice: price, thirdPartyPayerPrice: 0 };
};

exports.formatDraftBillsForCustomer = (customerPrices, event, eventPrice, service) => {
  const inclTaxesCustomer = exports.getInclTaxes(eventPrice.customerPrice, service.vat);
  const { endDate, startDate, _id: eventId, auxiliary } = event;
  const prices = {
    event: eventId,
    startDate,
    endDate,
    auxiliary,
    inclTaxesCustomer,
    exclTaxesCustomer: eventPrice.customerPrice,
  };
  if (eventPrice.surcharges) prices.surcharges = eventPrice.surcharges;

  if (eventPrice.thirdPartyPayerPrice && eventPrice.thirdPartyPayerPrice !== 0) {
    prices.inclTaxesTpp = exports.getInclTaxes(eventPrice.thirdPartyPayerPrice, service.vat);
    prices.exclTaxesTpp = eventPrice.thirdPartyPayerPrice;
    prices.thirdPartyPayer = eventPrice.thirdPartyPayer;
  }

  return {
    eventsList: [...customerPrices.eventsList, { ...prices }],
    hours: customerPrices.hours + ((moment(endDate).diff(moment(startDate), 'm')) / 60),
    exclTaxes: customerPrices.exclTaxes + eventPrice.customerPrice,
    inclTaxes: customerPrices.inclTaxes + inclTaxesCustomer,
  };
};

exports.formatDraftBillsForTPP = (tppPrices, tpp, event, eventPrice, service) => {
  const currentTppPrices = tppPrices[tpp._id] || { exclTaxes: 0, inclTaxes: 0, hours: 0, eventsList: [] };

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
      exclTaxes: currentTppPrices.exclTaxes + eventPrice.thirdPartyPayerPrice,
      inclTaxes: currentTppPrices.inclTaxes + exports.getInclTaxes(eventPrice.thirdPartyPayerPrice, service.vat),
      hours: currentTppPrices.hours + (eventPrice.chargedTime / 60),
      eventsList: [...currentTppPrices.eventsList, { ...prices }],
    },
  };
};

exports.computeBillingInfoForEvents = (events, service, fundings, billingStartDate, unitTTCRate) => {
  let customerPrices = { exclTaxes: 0, inclTaxes: 0, hours: 0, eventsList: [] };
  let thirdPartyPayerPrices = {};
  let startDate = moment(billingStartDate);
  const eventsByBillingItem = {};

  for (const event of events) {
    const matchingService = UtilsHelper.getMatchingVersion(event.startDate, service, 'startDate');
    const matchingFunding = get(fundings, 'length') ? exports.getMatchingFunding(event.startDate, fundings) : null;

    const eventPrice = exports.getEventBilling(event, unitTTCRate, matchingService, matchingFunding);

    customerPrices = exports.formatDraftBillsForCustomer(customerPrices, event, eventPrice, matchingService);
    if (matchingFunding && eventPrice.thirdPartyPayerPrice) {
      thirdPartyPayerPrices = exports.formatDraftBillsForTPP(
        thirdPartyPayerPrices,
        matchingFunding.thirdPartyPayer,
        event,
        eventPrice,
        matchingService
      );
    }

    if (moment(event.startDate).isBefore(startDate)) startDate = moment(event.startDate);

    for (const billingItem of matchingService.billingItems) {
      if (eventsByBillingItem[billingItem._id.toHexString()]) {
        eventsByBillingItem[billingItem._id.toHexString()].push(event._id.toHexString());
      } else {
        eventsByBillingItem[billingItem._id.toHexString()] = [event._id.toHexString()];
      }
    }
  }

  return { prices: { customerPrices, thirdPartyPayerPrices, startDate }, eventsByBillingItem };
};

exports.getDraftBillsPerSubscription = (events, subscription, fundings, billingStartDate, endDate) => {
  const { unitTTCRate } = UtilsHelper.getLastVersion(subscription.versions, 'createdAt');
  const serviceMatchingVersion = UtilsHelper.getMatchingVersion(endDate, subscription.service, 'startDate');
  const { prices: { customerPrices, thirdPartyPayerPrices, startDate }, eventsByBillingItem } =
    exports.computeBillingInfoForEvents(events, subscription.service, fundings, billingStartDate, unitTTCRate);

  const draftBillInfo = {
    _id: new ObjectID(),
    subscription,
    discount: 0,
    startDate: startDate.toDate(),
    endDate: moment(endDate, 'YYYYMMDD').toDate(),
    unitExclTaxes: exports.getExclTaxes(unitTTCRate, serviceMatchingVersion.vat),
    unitInclTaxes: unitTTCRate,
    vat: serviceMatchingVersion.vat || 0,
  };

  const draftBillsPerSubscription = {};
  if (customerPrices.exclTaxes !== 0) draftBillsPerSubscription.customer = { ...draftBillInfo, ...customerPrices };
  if (fundings && Object.keys(thirdPartyPayerPrices).length !== 0) {
    draftBillsPerSubscription.thirdPartyPayer = Object.keys(thirdPartyPayerPrices).reduce(
      (acc, tppId) => ({
        ...acc,
        [tppId]: {
          ...draftBillInfo,
          ...thirdPartyPayerPrices[tppId],
          _id: new ObjectID(),
          externalBilling: false,
          thirdPartyPayer: fundings.find(fund =>
            UtilsHelper.areObjectIdsEquals(fund.thirdPartyPayer._id, tppId)).thirdPartyPayer,
        },
      }),
      {}
    );
  }

  return { ...draftBillsPerSubscription, eventsByBillingItem };
};

const formatEventsByBillingItem = (eventsByBillingItemBySubscriptions) => {
  const eventsByBillingItem = {};
  for (const eventsByBillingItemInSubscription of eventsByBillingItemBySubscriptions) {
    // eslint-disable-next-line consistent-return
    mergeWith(eventsByBillingItem, eventsByBillingItemInSubscription, (a, b) => { if (a) return a.concat(b); });
  }

  return eventsByBillingItem;
};

exports.formatBillingItems = (eventsByBillingItemBySubscriptions, billingItems, startDate, endDate) => {
  const eventsByBillingItem = formatEventsByBillingItem(eventsByBillingItemBySubscriptions);

  const formattedBillingItems = [];
  for (const [billingItemId, eventsList] of Object.entries(eventsByBillingItem)) {
    const bddBillingItem = billingItems.find(bi => UtilsHelper.areObjectIdsEquals(bi._id, billingItemId));
    const unitExclTaxes = exports.getExclTaxes(bddBillingItem.defaultUnitAmount, bddBillingItem.vat);

    formattedBillingItems.push({
      _id: new ObjectID(),
      billingItem: { _id: billingItemId, name: bddBillingItem.name },
      discount: 0,
      unitExclTaxes,
      unitInclTaxes: bddBillingItem.defaultUnitAmount,
      vat: bddBillingItem.vat,
      eventsList,
      exclTaxes: unitExclTaxes * eventsList.length,
      inclTaxes: bddBillingItem.defaultUnitAmount * eventsList.length,
      startDate,
      endDate,
    });
  }

  return formattedBillingItems;
};

exports.getDraftBillsList = async (dates, billingStartDate, credentials, customerId = null) => {
  const companyId = get(credentials, 'company._id', null);
  const eventsToBill = await EventRepository.getEventsToBill(dates, customerId, companyId);
  const thirdPartyPayers = await ThirdPartyPayer.find({ company: companyId }).lean();
  const surcharges = await Surcharge.find({ company: companyId }).lean();
  const billingItems = await BillingItem.find({ company: companyId }).lean();
  const draftBillsList = [];
  for (let i = 0, l = eventsToBill.length; i < l; i++) {
    const subscriptionsDraftBills = [];
    const tppBills = {};
    const eventsByBillingItemBySubscriptions = [];
    const { customer, eventsBySubscriptions } = eventsToBill[i];
    for (let k = 0, L = eventsBySubscriptions.length; k < L; k++) {
      const subscription = await exports.populateAndFormatSubscription(
        eventsBySubscriptions[k].subscription,
        surcharges,
        billingItems
      );
      const fundings = eventsBySubscriptions[k].fundings
        ? await exports.populateFundings(eventsBySubscriptions[k].fundings, dates.endDate, thirdPartyPayers, companyId)
        : null;

      const draftBills = exports.getDraftBillsPerSubscription(
        eventsBySubscriptions[k].events,
        subscription,
        fundings,
        billingStartDate,
        dates.endDate
      );
      if (draftBills.customer) subscriptionsDraftBills.push(draftBills.customer);
      if (draftBills.eventsByBillingItem) eventsByBillingItemBySubscriptions.push(draftBills.eventsByBillingItem);
      if (draftBills.thirdPartyPayer) {
        for (const tpp of Object.keys(draftBills.thirdPartyPayer)) {
          if (!tppBills[tpp]) tppBills[tpp] = [draftBills.thirdPartyPayer[tpp]];
          else tppBills[tpp].push(draftBills.thirdPartyPayer[tpp]);
        }
      }
    }

    const customerBills = [
      ...subscriptionsDraftBills,
      ...exports.formatBillingItems(eventsByBillingItemBySubscriptions, billingItems, billingStartDate, dates.endDate),
    ];
    const groupedByCustomerBills = {
      customer,
      endDate: dates.endDate,
      customerBills: { bills: customerBills, total: customerBills.reduce((sum, b) => sum + (b.inclTaxes || 0), 0) },
    };
    if (Object.values(tppBills).length) {
      groupedByCustomerBills.thirdPartyPayerBills = [];
      for (const bills of Object.values(tppBills)) {
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
