const moment = require('moment');
const _ = require('lodash');
const momentRange = require('moment-range');
const {
  INTERVENTION,
  ABSENCE,
  UNAVAILABILITY,
  NEVER,
  COMPANY_CONTRACT,
  CUSTOMER_CONTRACT,
  INTERNAL_HOUR,
} = require('./constants');
const User = require('../models/User');
const Customer = require('../models/Customer');
const Contract = require('../models/Contract');
const { populateSubscriptionsServices } = require('../helpers/subscriptions');
const EventRepository = require('../repositories/EventRepository');

momentRange.extendMoment(moment);

exports.auxiliaryHasActiveCompanyContractOnDay = (contracts, day) =>
  contracts.some(contract =>
    contract.status === COMPANY_CONTRACT &&
      moment(contract.startDate).isSameOrBefore(day, 'd') && (!contract.endDate || moment(contract.endDate).isSameOrAfter(day, 'd')));

exports.checkContracts = async (event, user, credentials) => {
  if (!user.contracts || user.contracts.length === 0) return false;

  // If the event is an intervention :
  // - if it's a customer contract subscription, the auxiliary should have an active contract with the customer on the day of the intervention
  // - else (company contract subscription) the auxiliary should have an active contract on the day of the intervention and this customer
  //   should have an active subscription
  if (event.type === INTERVENTION) {
    let customer = await Customer
      .findOne({ _id: event.customer, company: _.get(credentials, 'company._id') })
      .populate({
        path: 'subscriptions.service',
        populate: { path: 'versions.surcharge' },
      })
      .lean();
    customer = populateSubscriptionsServices(customer);

    const eventSubscription = customer.subscriptions.find(sub => sub._id.toHexString() == event.subscription);
    if (!eventSubscription) return false;

    if (eventSubscription.service.type === CUSTOMER_CONTRACT) {
      const contractBetweenAuxAndCus = await Contract.findOne({ user: event.auxiliary, customer: event.customer });
      if (!contractBetweenAuxAndCus) return false;
      return contractBetweenAuxAndCus.endDate
        ? moment(event.startDate).isBetween(contractBetweenAuxAndCus.startDate, contractBetweenAuxAndCus.endDate, '[]')
        : moment(event.startDate).isSameOrAfter(contractBetweenAuxAndCus.startDate);
    }

    return exports.auxiliaryHasActiveCompanyContractOnDay(user.contracts, event.startDate);
  }

  // If the auxiliary is only under customer contract, create internal hours is not allowed
  if (event.type === INTERNAL_HOUR) {
    return exports.auxiliaryHasActiveCompanyContractOnDay(user.contracts, event.startDate);
  }

  return true;
};

exports.hasConflicts = async (event) => {
  const { _id, auxiliary, startDate, endDate } = event;
  const auxiliaryEvents = event.type !== ABSENCE
    ? await EventRepository.getAuxiliaryEventsBetweenDates(auxiliary, startDate, endDate)
    : await EventRepository.getAuxiliaryEventsBetweenDates(auxiliary, startDate, endDate, ABSENCE);

  return auxiliaryEvents.some((ev) => {
    if ((_id && _id.toHexString() === ev._id.toHexString()) || ev.isCancelled) return false;
    return true;
  });
};

const isOneDayEvent = event => moment(event.startDate).isSame(event.endDate, 'day');
const eventHasAuxiliarySector = (event, user) => event.sector === user.sector.toHexString();
const isAuxiliaryUpdated = (payload, eventFromDB) => payload.auxiliary && payload.auxiliary !== eventFromDB.auxiliary.toHexString();
const isRepetition = event => event.repetition && event.repetition.frequency && event.repetition.frequency !== NEVER;

exports.isCreationAllowed = async (event, credentials) => {
  if (event.type !== ABSENCE && !isOneDayEvent(event)) return false;
  if (!event.auxiliary) return event.type === INTERVENTION;
  const user = await User.findOne({ _id: event.auxiliary }).populate('contracts').lean();
  if (!await exports.checkContracts(event, user, credentials)) return false;

  if (!(isRepetition(event) && event.type === INTERVENTION) && await exports.hasConflicts(event)) return false;

  if (!eventHasAuxiliarySector(event, user)) return false;

  return true;
};

exports.isEditionAllowed = async (eventFromDB, payload, credentials) => {
  if (eventFromDB.type === INTERVENTION && eventFromDB.isBilled) return false;
  if ([ABSENCE, UNAVAILABILITY].includes(eventFromDB.type) && isAuxiliaryUpdated(payload, eventFromDB)) return false;

  const event = !payload.auxiliary
    ? { ..._.omit(eventFromDB, 'auxiliary'), ...payload }
    : { ...eventFromDB, ...payload };

  if (event.type !== ABSENCE && !isOneDayEvent(event)) return false;
  if (!event.auxiliary) return event.type === INTERVENTION;

  const user = await User.findOne({ _id: event.auxiliary }).populate('contracts').lean();
  if (!await exports.checkContracts(event, user, credentials)) return false;

  if (!(isRepetition(event) && event.type === INTERVENTION) && !event.isCancelled && (await exports.hasConflicts(event))) return false;

  if (!eventHasAuxiliarySector(event, user)) return false;

  return true;
};
