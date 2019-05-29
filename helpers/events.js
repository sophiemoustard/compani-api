const Boom = require('boom');
const moment = require('moment');
const flat = require('flat');
const _ = require('lodash');
const momentRange = require('moment-range');
const { ObjectID } = require('mongodb');
const {
  INTERVENTION,
  INTERNAL_HOUR,
  NEVER,
  EVERY_DAY,
  EVERY_WEEK_DAY,
  EVERY_WEEK,
  CUSTOMER_CONTRACT,
  COMPANY_CONTRACT,
  ABSENCE,
  UNAVAILABILITY,
  EVENT_TYPE_LIST,
  REPETITION_FREQUENCY_TYPE_LIST,
  CANCELLATION_CONDITION_LIST,
  CANCELLATION_REASON_LIST,
} = require('./constants');
const Event = require('../models/Event');
const User = require('../models/User');
const Customer = require('../models/Customer');
const Contract = require('../models/Contract');
const { populateSubscriptionsServices } = require('../helpers/subscriptions');
const { getFullTitleFromIdentity } = require('./utils');

momentRange.extendMoment(moment);

exports.auxiliaryHasActiveCompanyContractOnDay = (contracts, day) => contracts.some(contract => contract.status === COMPANY_CONTRACT &&
  moment(contract.startDate).isSameOrBefore(day, 'd') &&
  ((!contract.endDate && contract.versions.some(version => version.isActive)) || moment(contract.endDate).isAfter(day, 'd')));

exports.hasConflicts = async (event) => {
  const auxiliaryEvents = await Event.find({
    auxiliary: event.auxiliary,
    $or: [
      { startDate: { $gte: event.startDate, $lt: event.endDate } },
      { endDate: { $gt: event.startDate, $lte: event.endDate } },
      { startDate: { $lte: event.startDate }, endDate: { $gte: event.endDate } }
    ],
  });

  return auxiliaryEvents.some((ev) => {
    if ((event._id && event._id.toHexString() === ev._id.toHexString()) || ev.isCancelled) return false;
    return moment(event.startDate).isBetween(ev.startDate, ev.endDate, 'minutes', '[]') ||
      moment(ev.startDate).isBetween(event.startDate, event.endDate, 'minutes', '[]');
  });
};

exports.isCreationAllowed = async (event) => {
  if (!event.isCancelled && await exports.hasConflicts(event)) return false;

  let user = await User.findOne({ _id: event.auxiliary }).populate('contracts');
  user = user.toObject();
  if (!user.contracts || user.contracts.length === 0) {
    return false;
  }

  // If the event is an intervention :
  // - if it's a customer contract subscription, the auxiliary should have an active contract with the customer on the day of the intervention
  // - else (company contract subscription) the auxiliary should have an active contract on the day of the intervention and this customer
  //   should have an active subscription
  if (event.type === INTERVENTION) {
    let customer = await Customer.findOne({ _id: event.customer }).populate('subscriptions.service');
    customer = await populateSubscriptionsServices(customer.toObject());

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

exports.isEditionAllowed = async (eventFromDB, payload) => {
  if (eventFromDB.type === INTERVENTION && eventFromDB.isBilled) return false;

  if ([ABSENCE, UNAVAILABILITY].includes(eventFromDB.type) && payload.auxiliary && payload.auxiliary !== eventFromDB.auxiliary.toHexString()) {
    return false;
  }

  return exports.isCreationAllowed({ ...eventFromDB, ...payload });
};

exports.getListQuery = (req) => {
  let query = req.query.type ? { type: req.query.type } : {};
  if (req.query.auxiliary) query.auxiliary = { $in: req.query.auxiliary };
  if (req.query.customer) query.customer = { $in: req.query.customer };
  if (req.query.isBilled) query.customer = req.query.isBilled;
  if (req.query.startDate && req.query.endDate) {
    const searchStartDate = moment(req.query.startDate, 'YYYYMMDD hh:mm').toDate();
    const searchEndDate = moment(req.query.endDate, 'YYYYMMDD hh:mm').toDate();
    query = {
      ...query,
      $or: [
        { startDate: { $lte: searchEndDate, $gte: searchStartDate } },
        { endDate: { $lte: searchEndDate, $gte: searchStartDate } },
        { endDate: { $gte: searchEndDate }, startDate: { $lte: searchStartDate } },
      ],
    };
  } else if (req.query.startDate && !req.query.endDate) {
    const searchStartDate = moment(req.query.startDate, 'YYYYMMDD hh:mm').toDate();
    query = {
      ...query,
      $or: [
        { startDate: { $gte: searchStartDate } },
        { endDate: { $gte: searchStartDate } },
      ],
    };
  } else if (req.query.endDate) {
    const searchEndDate = moment(req.query.endDate, 'YYYYMMDD hh:mm').toDate();
    query = {
      ...query,
      $or: [
        { startDate: { $lte: searchEndDate } },
        { endDate: { $lte: searchEndDate } },
      ],
    };
  }

  return query;
};

exports.populateEventSubscription = (event) => {
  if (event.type !== INTERVENTION) return event;
  if (!event.customer || !event.customer.subscriptions) throw Boom.badImplementation();

  const subscription = event.customer.subscriptions.find(sub => sub._id.toHexString() === event.subscription.toHexString());
  if (!subscription) throw Boom.badImplementation();

  return { ...event, subscription };
};

exports.populateEvents = async (events) => {
  const populatedEvents = [];
  for (let i = 0; i < events.length; i++) {
    const event = await exports.populateEventSubscription(events[i]);
    populatedEvents.push(event);
  }

  return populatedEvents;
};

exports.updateEventsInternalHourType = async (oldInternalHourId, newInternalHour) => {
  const payload = { internalHour: newInternalHour };
  await Event.update(
    {
      type: INTERNAL_HOUR,
      'internalHour._id': oldInternalHourId,
      startDate: { $gte: moment().toDate() }
    },
    { $set: payload },
    { multi: true },
  );
};

exports.createRepetitionsEveryDay = async (event) => {
  const range = Array.from(moment().range(moment(event.startDate).add(1, 'd'), moment(event.startDate).add(1, 'Y')).by('days'));
  const promises = [];
  range.forEach((day, index) => {
    const repeatedEvent = new Event({
      ..._.omit(event, '_id'),
      startDate: moment(event.startDate).add(index + 1, 'd'),
      endDate: moment(event.endDate).add(index + 1, 'd'),
    });

    promises.push(repeatedEvent.save());
  });

  return Promise.all(promises);
};

exports.createRepetitionsEveryWeekDay = async (event) => {
  const range = Array.from(moment().range(moment(event.startDate).add(1, 'd'), moment(event.startDate).add(1, 'Y')).by('days'));
  const promises = [];
  range.forEach((day, index) => {
    if (moment(day).day() !== 0 && moment(day).day() !== 6) {
      const repeatedEvent = new Event({
        ..._.omit(event, '_id'),
        startDate: moment(event.startDate).add(index + 1, 'd'),
        endDate: moment(event.endDate).add(index + 1, 'd'),
      });

      promises.push(repeatedEvent.save());
    }
  });

  return Promise.all(promises);
};

exports.createRepetitionsEveryWeek = async (event) => {
  const range = Array.from(moment().range(moment(event.startDate).add(1, 'd'), moment(event.startDate).add(1, 'Y')).by('weeks'));
  const promises = [];
  range.forEach((day, index) => {
    const repeatedEvent = new Event({
      ..._.omit(event, '_id'),
      startDate: moment(event.startDate).add(index + 1, 'w'),
      endDate: moment(event.endDate).add(index + 1, 'w'),
    });

    promises.push(repeatedEvent.save());
  });

  return Promise.all(promises);
};

exports.createRepetitions = async (event) => {
  if (event.repetition.frequency === NEVER) return event;

  event.repetition.parentId = event._id;
  await Event.findOneAndUpdate({ _id: event._id }, { 'repetition.parentId': event._id });

  switch (event.repetition.frequency) {
    case EVERY_DAY:
      await exports.createRepetitionsEveryDay(event);
      break;
    case EVERY_WEEK_DAY:
      await exports.createRepetitionsEveryWeekDay(event);
      break;
    case EVERY_WEEK:
      await exports.createRepetitionsEveryWeek(event);
      break;
    default:
      break;
  }

  return event;
};

exports.updateRepetitions = async (event, payload) => {
  const parentStartDate = moment(payload.startDate);
  const parentEndtDate = moment(payload.endDate);
  const promises = [];

  const events = await Event.find({ 'repetition.parentId': event.repetition.parentId, startDate: { $gt: new Date(event.startDate) } });
  events.forEach((ev) => {
    const startDate = moment(ev.startDate).hours(parentStartDate.hours());
    startDate.minutes(parentStartDate.minutes());
    const endDate = moment(ev.endDate).hours(parentEndtDate.hours());
    endDate.minutes(parentEndtDate.minutes());
    promises.push(Event.findOneAndUpdate(
      { _id: ev._id },
      { $set: flat({ ...payload, startDate: startDate.toISOString(), endDate: endDate.toISOString() }) }
    ));
  });

  return Promise.all(promises);
};

exports.updateEvent = async (event, payload) => {
  /**
   * 1. If the event is in a repetition and we update it without updating the repetition, we should remove it from the repetition
   * i.e. delete the repetition object. EXCEPT if we are only updating the misc field
   *
   * 2. if the event is cancelled and the payload doesn't contain any cancellation info, it means we should remove the camcellation
   * i.e. delete the cancel object and set isCancelled to false.
   */

  let miscUpdatedOnly = false;
  if (payload.misc) {
    if (!event.misc || event.misc === '' || (payload.misc !== event.misc && _.isEqual(
      _.omit(event, ['misc', 'repetition', 'location', 'isBilled', '_id', 'type', 'customer', 'createdAt', 'updatedAt']),
      _.omit({ ...payload, ...(!payload.isCancelled && { isCancelled: false }) }, ['misc'])
    ))) miscUpdatedOnly = true;
  }

  if (event.type === ABSENCE || !event.repetition || event.repetition.frequency === NEVER || payload.shouldUpdateRepetition || miscUpdatedOnly) {
    event = await Event
      .findOneAndUpdate(
        { _id: event._id },
        {
          ...(!payload.isCancelled && event.isCancelled
            ? { $set: flat({ ...payload, isCancelled: false }), $unset: { cancel: '' } }
            : { $set: flat(payload) })
        },
        { autopopulate: false, new: true }
      )
      .populate({ path: 'auxiliary', select: 'identity administrative.driveFolder administrative.transportInvoice company picture' })
      .populate({ path: 'customer', select: 'identity subscriptions contact' })
      .lean();

    if (!miscUpdatedOnly && event.repetition && event.repetition.frequency !== NEVER && payload.shouldUpdateRepetition) await exports.updateRepetitions(event, payload);
  } else {
    event = await Event
      .findOneAndUpdate(
        { _id: event._id },
        {
          ...(!payload.isCancelled && event.isCancelled
            ? { $set: flat({ ...payload, isCancelled: false, 'repetition.frequency': NEVER }), $unset: { cancel: '', 'repetition.parentId': '' } }
            : { $set: flat({ ...payload, 'repetition.frequency': NEVER }), $unset: { 'repetition.parentId': '' } })
        },
        { autopopulate: false, new: true }
      )
      .populate({ path: 'auxiliary', select: 'identity administrative.driveFolder administrative.transportInvoice company picture' })
      .populate({ path: 'customer', select: 'identity subscriptions contact' })
      .lean();
  }

  return exports.populateEventSubscription(event);
};

exports.deleteRepetition = async (event) => {
  await Event.deleteMany({
    'repetition.parentId': event.repetition.parentId,
    startDate: { $gt: new Date(event.startDate) },
    $or: [{ isBilled: false }, { isBilled: { $exists: false } }]
  });
};

exports.removeEventsByContractStatus = async (contract) => {
  if (!contract) throw Boom.badRequest();

  const customerSubscriptionsFromEvents = await Event.aggregate([
    {
      $match: {
        $and: [
          { startDate: { $gt: new Date(contract.endDate) } },
          { auxiliary: new ObjectID(contract.user) },
          { $or: [{ isBilled: false }, { isBilled: { $exists: false } }] },
        ]
      },
    },
    {
      $group: {
        _id: { SUBS: '$subscription', CUSTOMER: '$customer' },
      }
    },
    {
      $lookup: {
        from: 'customers',
        localField: '_id.CUSTOMER',
        foreignField: '_id',
        as: 'customer'
      }
    },
    { $unwind: { path: '$customer' } },
    {
      $addFields: {
        sub: {
          $filter: { input: '$customer.subscriptions', as: 'sub', cond: { $eq: ['$$sub._id', '$_id.SUBS'] } },
        }
      }
    },
    { $unwind: { path: '$sub' } },
    {
      $lookup: {
        from: 'services',
        localField: 'sub.service',
        foreignField: '_id',
        as: 'sub.service',
      }
    },
    { $unwind: { path: '$sub.service' } },
    {
      $project: {
        _id: 0,
        customer: { _id: 1 },
        sub: 1
      }
    },
  ]);


  if (customerSubscriptionsFromEvents.length === 0) return;
  let correspondingSubs;
  if (contract.status === COMPANY_CONTRACT) {
    correspondingSubs = customerSubscriptionsFromEvents.filter(ev => ev.sub.service.type === contract.status);
  } else {
    correspondingSubs = customerSubscriptionsFromEvents.filter(ev => ev.customer._id === contract.customer && ev.sub.service.type === contract.status);
  }
  const correspondingSubsIds = correspondingSubs.map(sub => sub.sub._id);
  await Event.deleteMany({ startDate: { $gt: contract.endDate }, subscription: { $in: correspondingSubsIds }, isBilled: false });
};

exports.exportWorkingEventsHistory = async (startDate, endDate) => {
  const query = {
    type: { $in: [INTERVENTION, INTERNAL_HOUR] },
    $or: [
      { startDate: { $lte: endDate, $gte: startDate } },
      { endDate: { $lte: endDate, $gte: startDate } },
      { endDate: { $gte: endDate }, startDate: { $lte: startDate } },
    ],
  };

  const events = await Event.find(query)
    .sort({ startDate: 'desc' })
    .populate({ path: 'auxiliary', select: 'identity' })
    .populate({ path: 'customer', select: 'identity' })
    .populate({ path: 'sector' })
    .lean();

  const header = [
    'Type',
    'Début',
    'Fin',
    'Répétition',
    'Secteur',
    'Auxiliaire',
    'Bénéficiaire',
    'Divers',
    'Facturé',
    'Annulé',
    'Statut de l\'annulation',
    'Raison de l\'annulation',
  ];

  const rows = [header];

  for (const event of events) {
    let repetition = _.get(event.repetition, 'frequency');
    repetition = (NEVER === repetition) ? '' : REPETITION_FREQUENCY_TYPE_LIST[repetition];

    const cells = [
      EVENT_TYPE_LIST[event.type],
      moment(event.startDate).format('DD/MM/YYYY'),
      moment(event.endDate).format('DD/MM/YYYY'),
      repetition || '',
      _.get(event.sector, 'name') || '',
      getFullTitleFromIdentity(_.get(event.auxiliary, 'identity') || {}),
      getFullTitleFromIdentity(_.get(event.customer, 'identity') || {}),
      event.misc || '',
      event.isBilled ? 'Oui' : 'Non',
      event.isCancelled ? 'Oui' : 'Non',
      CANCELLATION_CONDITION_LIST[_.get(event.cancel, 'condition')] || '',
      CANCELLATION_REASON_LIST[_.get(event.cancel, 'reason')] || '',
    ];

    rows.push(cells);
  }

  return rows;
};
