const get = require('lodash/get');
const pick = require('lodash/pick');
const { ObjectId } = require('mongodb');
const moment = require('../extensions/moment');
const EventRepository = require('../repositories/EventRepository');
const BillingItem = require('../models/BillingItem');
const Surcharge = require('../models/Surcharge');
const ThirdPartyPayer = require('../models/ThirdPartyPayer');
const FundingHistory = require('../models/FundingHistory');
const { HOURLY, MONTHLY, ONCE, BILLING_DIRECT, FIXED } = require('./constants');
const UtilsHelper = require('./utils');
const SurchargesHelper = require('./surcharges');
const DatesHelper = require('./dates');
const NumbersHelper = require('./numbers');
const FundingsHelper = require('./fundings');
const { CompaniDate } = require('./dates/companiDates');

exports.getDurationInMinutes = (startDate, endDate) => CompaniDate(endDate).oldDiff(startDate, 'minutes', true).minutes;

const populateSurchargeAndBillingItem = (serviceVersions, surcharges, billingItems) => serviceVersions
  .map(v => ({
    ...v,
    ...(v.surcharge && { surcharge: surcharges.find(s => UtilsHelper.areObjectIdsEquals(s._id, v.surcharge)) }),
    billingItems: v.billingItems.map(bi => billingItems.find(bddBI => UtilsHelper.areObjectIdsEquals(bddBI._id, bi))),
  }))
  .sort(DatesHelper.descendingSort('startDate'));

exports.populateAndFormatSubscription = async (subscription, surcharges, billingItems) => ({
  ...subscription,
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
      if (history) {
        funding.history = [history];
      } else {
        funding.history = [
          { careHours: NumbersHelper.toString(0), amountTTC: NumbersHelper.toString(0), fundingId: funding._id },
        ];
      }
    } else {
      const history = await FundingHistory.find({ fundingId: funding._id, company: companyId }).lean();
      if (history) funding.history = history;
      if (history.length === 0 || !history) funding.history = [];
      if (!history.some(his => his.month === moment(endDate).format('MM/YYYY'))) {
        funding.history.push({
          careHours: NumbersHelper.toString(0),
          amountTTC: NumbersHelper.toString(0),
          fundingId: funding._id,
          month: moment(endDate).format('MM/YYYY'),
        });
      }
    }
    populatedFundings.push(funding);
  }

  return populatedFundings;
};

/**
 *
 * @param {number} eventMinutes
 * @param {array} eventSurcharges
 * @param {string} price
 * @returns string
 */
exports.getSurchargedPrice = (eventMinutes, eventSurcharges, price) => {
  if (!eventMinutes) return '0';

  let coeff = NumbersHelper.multiply(eventMinutes, 100);
  for (const surcharge of eventSurcharges) {
    if (surcharge.startHour) {
      const surchargedDuration = exports.getDurationInMinutes(surcharge.startHour, surcharge.endHour);
      coeff = NumbersHelper.add(coeff, NumbersHelper.multiply(surchargedDuration, surcharge.percentage));
    } else {
      coeff = NumbersHelper.add(coeff, NumbersHelper.multiply(surcharge.percentage, eventMinutes));
    }
  }

  return NumbersHelper.divide(NumbersHelper.multiply(coeff, price), NumbersHelper.multiply(eventMinutes, 100));
};

/**
 *
 * @param {string} time
 * @param {number} fundingInclTaxes
 * @param {number} customerParticipationRate
 * @returns string
 */
exports.getThirdPartyPayerPrice = (time, fundingInclTaxes, customerParticipationRate) => {
  const tppParticipationRate = NumbersHelper.subtract(1, NumbersHelper.divide(customerParticipationRate, 100));

  return NumbersHelper.multiply(NumbersHelper.divide(time, 60), fundingInclTaxes, tppParticipationRate);
};

exports.getMatchingHistory = (event, funding) => {
  if (funding.frequency === ONCE) return funding.history[0];

  let history = funding.history.find(his => his.month === moment(event.startDate).format('MM/YYYY'));
  if (history) return history;

  funding.history.push({
    careHours: NumbersHelper.toString(0),
    amountTTC: NumbersHelper.toString(0),
    fundingId: funding._id,
    month: moment(event.startDate).format('MM/YYYY'),
  });
  history = funding.history.find(his => his.month === moment(event.startDate).format('MM/YYYY'));

  return history;
};

/**
 *
 * @param {object} event
 * @param {number} eventMinutes
 * @param {object} funding
 * @param {string} price
 * @returns object
 */
exports.getHourlyFundingSplit = (event, eventMinutes, funding, price) => {
  let thirdPartyPayerPrice = NumbersHelper.toString(0);
  const history = exports.getMatchingHistory(event, funding);

  let chargedTime = NumbersHelper.toString(0);
  if (history && NumbersHelper.isLessThan(history.careHours, funding.careHours)) {
    const totalCareHours = NumbersHelper.add(history.careHours, NumbersHelper.divide(eventMinutes, 60));
    chargedTime = NumbersHelper.isGreaterThan(totalCareHours, funding.careHours)
      ? NumbersHelper.multiply(NumbersHelper.subtract(funding.careHours, history.careHours), 60)
      : NumbersHelper.toString(eventMinutes);
    thirdPartyPayerPrice = exports.getThirdPartyPayerPrice(
      chargedTime,
      funding.unitTTCRate,
      funding.customerParticipationRate
    );
    history.careHours = NumbersHelper.isGreaterThan(totalCareHours, funding.careHours)
      ? funding.careHours
      : NumbersHelper.add(history.careHours, NumbersHelper.divide(chargedTime, 60));
  }

  return {
    customerPrice: NumbersHelper.subtract(price, thirdPartyPayerPrice),
    thirdPartyPayerPrice,
    history: {
      careHours: NumbersHelper.divide(chargedTime, 60),
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
 *
 * @param {object} event
 * @param {object} funding
 * @param {string} price
 * @returns object
 */
exports.getFixedFundingSplit = (event, funding, price) => {
  let thirdPartyPayerPrice = NumbersHelper.toString(0);
  if (funding.history && NumbersHelper.isLessThan(funding.history[0].amountTTC, funding.amountTTC)) {
    const history = funding.history[0];
    if (NumbersHelper.isLessThan(NumbersHelper.add(history.amountTTC, price), funding.amountTTC)) {
      thirdPartyPayerPrice = price;
      history.amountTTC = NumbersHelper.add(history.amountTTC, thirdPartyPayerPrice);
    } else {
      thirdPartyPayerPrice = NumbersHelper.subtract(funding.amountTTC, history.amountTTC);
      history.amountTTC = funding.amountTTC;
    }
  }

  const chargedTime = exports.getDurationInMinutes(event.startDate, event.endDate);

  return {
    customerPrice: NumbersHelper.subtract(price, thirdPartyPayerPrice),
    thirdPartyPayerPrice,
    history: { amountTTC: thirdPartyPayerPrice, fundingId: funding._id, nature: funding.nature },
    fundingId: funding._id,
    thirdPartyPayer: funding.thirdPartyPayer._id,
    chargedTime,
  };
};

exports.getEventBilling = (event, unitTTCRate, service, funding) => {
  const billing = {};
  const eventMinutes = exports.getDurationInMinutes(event.startDate, event.endDate);
  let price = service.nature === HOURLY
    ? NumbersHelper.multiply(NumbersHelper.divide(eventMinutes, 60), unitTTCRate)
    : NumbersHelper.toString(unitTTCRate);

  if (service.surcharge && service.nature === HOURLY) {
    const surcharges = SurchargesHelper.getEventSurcharges(event, service.surcharge);
    if (surcharges.length > 0) {
      billing.surcharges = surcharges;
      price = exports.getSurchargedPrice(eventMinutes, surcharges, price);
    }
  }

  if (funding && !event.isCancelled) {
    const fundingBilling = funding.nature === HOURLY
      ? exports.getHourlyFundingSplit(event, eventMinutes, funding, price)
      : exports.getFixedFundingSplit(event, funding, price);

    return { ...billing, ...fundingBilling };
  }

  return { ...billing, customerPrice: price, thirdPartyPayerPrice: NumbersHelper.toString(0) };
};

exports.formatDraftBillsForCustomer = (customerPrices, event, eventPrice, service) => {
  const { endDate, startDate, _id: eventId, auxiliary } = event;
  const exclTaxesCustomer = UtilsHelper.getExclTaxes(eventPrice.customerPrice, service.vat);
  const prices = {
    event: eventId,
    startDate,
    endDate,
    auxiliary,
    inclTaxesCustomer: eventPrice.customerPrice,
    exclTaxesCustomer,
  };
  if (eventPrice.surcharges) prices.surcharges = eventPrice.surcharges;

  if (eventPrice.thirdPartyPayerPrice && !NumbersHelper.isEqualTo(eventPrice.thirdPartyPayerPrice, 0)) {
    prices.inclTaxesTpp = eventPrice.thirdPartyPayerPrice;
    prices.exclTaxesTpp = UtilsHelper.getExclTaxes(eventPrice.thirdPartyPayerPrice, service.vat);
    prices.thirdPartyPayer = eventPrice.thirdPartyPayer;
  }

  const eventDuration = exports.getDurationInMinutes(startDate, endDate);

  return {
    eventsList: [...customerPrices.eventsList, { ...prices }],
    hours: NumbersHelper.add(customerPrices.hours, NumbersHelper.divide(eventDuration, 60)),
    inclTaxes: NumbersHelper.add(customerPrices.inclTaxes, eventPrice.customerPrice),
  };
};

exports.formatDraftBillsForTPP = (tppPrices, tpp, event, eventPrice, service) => {
  const currentTppPrices = tppPrices[tpp._id] ||
    {
      inclTaxes: NumbersHelper.toString(0),
      hours: NumbersHelper.toString(0),
      eventsList: [],
    };

  const exclTaxesTpp = UtilsHelper.getExclTaxes(eventPrice.thirdPartyPayerPrice, service.vat);
  const prices = {
    event: event._id,
    startDate: event.startDate,
    endDate: event.endDate,
    auxiliary: event.auxiliary,
    exclTaxesTpp,
    inclTaxesTpp: eventPrice.thirdPartyPayerPrice,
    thirdPartyPayer: eventPrice.thirdPartyPayer,
    exclTaxesCustomer: UtilsHelper.getExclTaxes(eventPrice.customerPrice, service.vat),
    inclTaxesCustomer: eventPrice.customerPrice,
    history: { ...eventPrice.history },
    fundingId: eventPrice.fundingId,
    nature: eventPrice.history.nature,
  };

  if (eventPrice.surcharges && prices.nature === FIXED) prices.surcharges = eventPrice.surcharges;

  return {
    ...tppPrices,
    [tpp._id]: {
      inclTaxes: NumbersHelper.add(currentTppPrices.inclTaxes, eventPrice.thirdPartyPayerPrice),
      hours: NumbersHelper.add(currentTppPrices.hours, NumbersHelper.divide(eventPrice.chargedTime, 60)),
      eventsList: [...currentTppPrices.eventsList, { ...prices }],
    },
  };
};

exports.computeBillingInfoForEvents = (events, service, fundings, billingStartDate, unitTTCRate) => {
  let customerPrices = { inclTaxes: NumbersHelper.toString(0), hours: NumbersHelper.toString(0), eventsList: [] };
  let thirdPartyPayerPrices = {};
  let startDate = moment(billingStartDate);
  const eventsByBillingItem = {};

  for (const event of events) {
    const matchingService = UtilsHelper.getMatchingVersion(event.startDate, service, 'startDate');
    const matchingFunding = get(fundings, 'length')
      ? FundingsHelper.getMatchingFunding(event.startDate, fundings)
      : null;

    const eventPrice = exports.getEventBilling(event, unitTTCRate, matchingService, matchingFunding);

    customerPrices = exports.formatDraftBillsForCustomer(customerPrices, event, eventPrice, matchingService);

    const hasTppPrice = eventPrice.thirdPartyPayerPrice && !NumbersHelper.isEqualTo(eventPrice.thirdPartyPayerPrice, 0);
    if (matchingFunding && hasTppPrice) {
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
        eventsByBillingItem[billingItem._id.toHexString()].push(event);
      } else {
        eventsByBillingItem[billingItem._id.toHexString()] = [event];
      }
    }
  }

  const lastVersion = UtilsHelper.getLastVersion(service.versions, 'createdAt');
  customerPrices.exclTaxes = UtilsHelper.getExclTaxes(customerPrices.inclTaxes, lastVersion.vat);

  for (const tppId of Object.keys(thirdPartyPayerPrices)) {
    const tppPrice = thirdPartyPayerPrices[tppId];
    tppPrice.exclTaxes = UtilsHelper.getExclTaxes(tppPrice.inclTaxes, lastVersion.vat);
  }

  return { prices: { customerPrices, thirdPartyPayerPrices, startDate }, eventsByBillingItem };
};

exports.getDraftBillsPerSubscription = (events, subscription, fundings, billingStartDate, endDate) => {
  const { unitTTCRate } = UtilsHelper.getLastVersion(subscription.versions, 'createdAt');
  const serviceMatchingVersion = UtilsHelper.getMatchingVersion(endDate, subscription.service, 'startDate');
  const { prices: { customerPrices, thirdPartyPayerPrices, startDate }, eventsByBillingItem } =
    exports.computeBillingInfoForEvents(events, subscription.service, fundings, billingStartDate, unitTTCRate);

  const draftBillInfo = {
    _id: new ObjectId(),
    subscription,
    discount: 0,
    startDate: startDate.toDate(),
    endDate: moment(endDate, 'YYYYMMDD').toDate(),
    unitExclTaxes: UtilsHelper.getExclTaxes(unitTTCRate, serviceMatchingVersion.vat),
    unitInclTaxes: unitTTCRate,
    vat: serviceMatchingVersion.vat || 0,
  };

  const draftBillsPerSubscription = {};
  if (customerPrices.exclTaxes && !NumbersHelper.isEqualTo(customerPrices.exclTaxes, 0)) {
    draftBillsPerSubscription.customer = { ...draftBillInfo, ...customerPrices };
  }
  if (fundings && Object.keys(thirdPartyPayerPrices).length !== 0) {
    draftBillsPerSubscription.thirdPartyPayer = Object.keys(thirdPartyPayerPrices).reduce(
      (acc, tppId) => ({
        ...acc,
        [tppId]: {
          ...draftBillInfo,
          ...thirdPartyPayerPrices[tppId],
          _id: new ObjectId(),
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
    for (const [billingItemId, eventsList] of Object.entries(eventsByBillingItemInSubscription)) {
      if (eventsByBillingItem[billingItemId]) {
        eventsByBillingItem[billingItemId] = eventsByBillingItem[billingItemId].concat(eventsList);
      } else {
        eventsByBillingItem[billingItemId] = eventsList;
      }
    }
  }

  return eventsByBillingItem;
};

exports.formatBillingItems = (eventsByBillingItemBySubscriptions, billingItems, startDate, endDate) => {
  const eventsByBillingItem = formatEventsByBillingItem(eventsByBillingItemBySubscriptions);

  const formattedBillingItems = [];
  for (const [billingItemId, eventsList] of Object.entries(eventsByBillingItem)) {
    const bddBillingItem = billingItems.find(bi => UtilsHelper.areObjectIdsEquals(bi._id, billingItemId));
    const unitExclTaxes = UtilsHelper.getExclTaxes(bddBillingItem.defaultUnitAmount, bddBillingItem.vat);
    const inclTaxes = NumbersHelper.multiply(bddBillingItem.defaultUnitAmount, eventsList.length);
    const exclTaxes = UtilsHelper.getExclTaxes(inclTaxes, bddBillingItem.vat);

    formattedBillingItems.push({
      _id: new ObjectId(),
      billingItem: { _id: new ObjectId(billingItemId), name: bddBillingItem.name },
      discount: 0,
      unitExclTaxes,
      unitInclTaxes: bddBillingItem.defaultUnitAmount,
      vat: bddBillingItem.vat,
      eventsList: eventsList.map(ev => ({ event: ev._id, ...pick(ev, ['startDate', 'endDate', 'auxiliary']) })),
      exclTaxes,
      inclTaxes,
      startDate,
      endDate,
    });
  }

  return formattedBillingItems;
};

exports.formatCustomerBills = (customerBills, tppBills, query, customer) => {
  const groupedByCustomerBills = {
    customer,
    endDate: query.endDate,
    customerBills: {
      bills: customerBills,
      total: NumbersHelper.toFixedToFloat(UtilsHelper.sumReduce(customerBills, 'inclTaxes')),
    },
  };

  if (Object.values(tppBills).length) {
    groupedByCustomerBills.thirdPartyPayerBills = [];
    for (const bills of Object.values(tppBills)) {
      groupedByCustomerBills.thirdPartyPayerBills.push({
        bills,
        total: NumbersHelper.toFixedToFloat(UtilsHelper.sumReduce(bills, 'inclTaxes')),
      });
    }
  }

  return groupedByCustomerBills;
};

exports.getDraftBillsList = async (query, credentials) => {
  const companyId = get(credentials, 'company._id');
  const [eventsToBill, tpps, surcharges, billingItems] = await Promise.all([
    EventRepository.getEventsToBill(query, companyId),
    ThirdPartyPayer.find({ company: companyId }).lean(),
    Surcharge.find({ company: companyId }).lean(),
    BillingItem.find({ company: companyId }).lean(),
  ]);

  const draftBillsList = [];
  for (let i = 0, l = eventsToBill.length; i < l; i++) {
    const subscriptionsDraftBills = [];
    const tppBills = {};
    const eventsByItemBySubscriptions = [];
    const { customer, eventsBySubscriptions } = eventsToBill[i];
    for (let k = 0, L = eventsBySubscriptions.length; k < L; k++) {
      const { subscription, fundings, events } = eventsBySubscriptions[k];
      const eventSubscription = await exports.populateAndFormatSubscription(subscription, surcharges, billingItems);
      const eventFundings = fundings ? await exports.populateFundings(fundings, query.endDate, tpps, companyId) : null;

      const draftBills = exports.getDraftBillsPerSubscription(
        events,
        eventSubscription,
        eventFundings,
        query.billingStartDate,
        query.endDate
      );
      if (draftBills.customer) subscriptionsDraftBills.push(draftBills.customer);
      if (draftBills.eventsByBillingItem) eventsByItemBySubscriptions.push(draftBills.eventsByBillingItem);
      if (draftBills.thirdPartyPayer) {
        for (const tpp of Object.keys(draftBills.thirdPartyPayer)) {
          if (!tppBills[tpp]) tppBills[tpp] = [draftBills.thirdPartyPayer[tpp]];
          else tppBills[tpp].push(draftBills.thirdPartyPayer[tpp]);
        }
      }
    }

    const customerBills = [
      ...subscriptionsDraftBills,
      ...exports.formatBillingItems(eventsByItemBySubscriptions, billingItems, query.billingStartDate, query.endDate),
    ];
    draftBillsList.push(exports.formatCustomerBills(customerBills, tppBills, query, customer));
  }

  return draftBillsList;
};
