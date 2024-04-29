const { ObjectId } = require('mongodb');
const moment = require('moment');
const omit = require('lodash/omit');
const get = require('lodash/get');
const has = require('lodash/has');
const groupBy = require('lodash/groupBy');
const { cloneDeep } = require('lodash');
const Event = require('../models/Event');
const UtilsHelper = require('../helpers/utils');
const NumbersHelper = require('../helpers/numbers');
const {
  INTERNAL_HOUR,
  INTERVENTION,
  ABSENCE,
  INVOICED_AND_PAID,
  NOT_INVOICED_AND_NOT_PAID,
  INVOICED_AND_NOT_PAID,
} = require('../helpers/constants');
const { CompaniDuration } = require('../helpers/dates/companiDurations');
const { CompaniDate } = require('../helpers/dates/companiDates');

exports.formatEvent = (event) => {
  const formattedEvent = {
    ...cloneDeep(omit(event, 'histories')),
    startDateTimeStamp: new Event(event).isStartDateTimeStamped(),
    endDateTimeStamp: new Event(event).isEndDateTimeStamped(),
  };

  const { auxiliary, subscription, customer } = event;
  if (auxiliary) {
    const matchingSectorHistory =
      UtilsHelper.getMatchingObject(event.startDate, auxiliary.sectorHistories, 'startDate');
    formattedEvent.auxiliary = { ...omit(auxiliary, 'sectorHistories'), sector: matchingSectorHistory.sector };
  }

  if (subscription) {
    formattedEvent.subscription = customer.subscriptions.find(s => UtilsHelper.areObjectIdsEquals(subscription, s._id));
  }

  return formattedEvent;
};

exports.getEventsGroupedBy = async (rules, groupByFunc, companyId) => {
  const events = await Event.find(rules)
    .populate({
      path: 'auxiliary',
      populate: { path: 'sectorHistories', match: { company: companyId }, populate: { path: 'sector' } },
      select: 'identity administrative.driveFolder company picture sectorHistories',
    })
    .populate({
      path: 'customer',
      match: { company: companyId },
      populate: { path: 'subscriptions.service' },
      select: 'identity contact subscriptions',
    })
    .populate({ path: 'internalHour' })
    .populate({ path: 'extension' })
    .populate({ path: 'histories', match: { company: companyId } })
    .lean();

  return groupBy(events.map(exports.formatEvent), groupByFunc);
};

exports.getEventsGroupedByAuxiliaries = async (rules, companyId) =>
  exports.getEventsGroupedBy(rules, ev => (ev.auxiliary ? ev.auxiliary._id : ev.sector), companyId);

exports.getEventsGroupedByCustomers = async (rules, companyId) =>
  exports.getEventsGroupedBy(rules, 'customer._id', companyId);

exports.getEventList = (rules, companyId) => Event.find(rules)
  .populate({
    path: 'auxiliary',
    select: 'identity administrative.driveFolder administrative.transportInvoice company picture sector',
    populate: { path: 'sector', select: '_id sector', match: { company: companyId } },
  })
  .populate({
    path: 'customer',
    select: 'identity subscriptions contact',
    populate: { path: 'subscriptions.service' },
  })
  .populate({ path: 'internalHour', select: '-__v -createdAt -updatedAt' })
  .populate({ path: 'extension', select: '-__v -createdAt -updatedAt' })
  .populate({ path: 'histories', select: '-__v -updatedAt', match: { company: companyId } })
  .lean({ autopopulate: true, viruals: true });

exports.formatEventsInConflictQuery = (dates, auxiliary, types, companyId, eventId = null) => {
  const query = {
    startDate: { $lt: dates.endDate },
    endDate: { $gt: dates.startDate },
    auxiliary,
    type: { $in: types },
    company: companyId,
  };

  if (eventId) query._id = { $ne: eventId };

  return query;
};

exports.getAuxiliaryEventsBetweenDates = async (auxiliary, startDate, endDate, companyId, type = null) => {
  const query = {
    auxiliary,
    startDate: { $lt: new Date(endDate) },
    endDate: { $gt: new Date(startDate) },
    company: companyId,
  };

  const eventList = await Event.find(query)
    .populate({ path: 'startDateTimeStamp' })
    .populate({ path: 'endDateTimeStamp' })
    .lean();

  if (!type) return eventList;

  return eventList.filter(event =>
    event.type === type || event.isBilled || event.startDateTimeStamp || event.endDateTimeStamp);
};

exports.getEvent = async (eventId, credentials) => Event.findOne({ _id: eventId })
  .populate({
    path: 'auxiliary',
    select: 'identity administrative.driveFolder administrative.transportInvoice company',
  })
  .populate({ path: 'customer', select: 'identity subscriptions contact' })
  .populate({ path: 'internalHour', match: { company: get(credentials, 'company._id') } })
  .lean();

exports.getAbsencesForExport = async (start, end, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const query = {
    type: ABSENCE,
    startDate: { $lt: end },
    endDate: { $gt: start },
    company: companyId,
  };

  return Event.find(query)
    .sort({ startDate: 'desc' })
    .populate({
      path: 'auxiliary',
      select: 'identity sector contracts',
      populate: [
        { path: 'sector', match: { company: companyId } },
        { path: 'contracts', match: { company: companyId } },
      ],
    })
    .populate({ path: 'extension', select: 'startDate' })
    .lean({ autopopulate: true });
};

exports.getEventsGroupedByParentId = async (rules, companyId) => Event.aggregate([
  { $match: rules },
  {
    $group: {
      _id: { $ifNull: ['$repetition.parentId', null] },
      events: { $push: '$$ROOT' },
    },
  },
  { $unwind: { path: '$events' } },
  { $sort: { 'events.startDate': 1 } },
  { $group: { _id: '$_id', events: { $push: '$events' } } },
]).option({ company: companyId });

exports.getInterventionsToUnassign = async (maxDate, auxiliary, companyId) => exports.getEventsGroupedByParentId({
  startDate: { $gt: maxDate },
  auxiliary,
  $or: [{ isBilled: false }, { isBilled: { $exists: false } }],
  type: INTERVENTION,
}, companyId);

exports.getAbsences = async (auxiliaryId, maxEndDate, companyId) => Event.find({
  type: ABSENCE,
  auxiliary: auxiliaryId,
  startDate: { $lte: maxEndDate },
  endDate: { $gt: maxEndDate },
  company: companyId,
}).lean();

exports.getEventsToPay = async (start, end, auxiliaries, companyId) => {
  const rules = {
    startDate: { $lt: end },
    endDate: { $gt: start },
    $or: [
      { type: INTERVENTION, $or: [{ isCancelled: false }, { 'cancel.condition': INVOICED_AND_PAID }] },
      { type: { $in: [INTERNAL_HOUR, ABSENCE] } },
    ],
    auxiliary: { $in: auxiliaries },
  };

  return Event.aggregate([
    { $match: rules },
    {
      $project: {
        type: 1,
        startDate: 1,
        endDate: 1,
        auxiliary: 1,
        sector: 1,
        customer: 1,
        subscription: 1,
        internalHour: 1,
        absence: 1,
        absenceNature: 1,
        address: 1,
        isCancelled: 1,
        cancel: 1,
        condition: 1,
        company: 1,
        transportMode: 1,
        kmDuringEvent: 1,
      },
    },
    {
      $group: {
        _id: {
          auxiliary: '$auxiliary',
          year: { $year: '$startDate' },
          month: { $month: '$startDate' },
          week: { $week: '$startDate' },
          day: { $dayOfWeek: '$startDate' },
        },
        eventsPerDay: { $push: { $cond: [{ $in: ['$type', [INTERNAL_HOUR, INTERVENTION]] }, '$$ROOT', null] } },
        absences: { $push: { $cond: [{ $eq: ['$type', ABSENCE] }, '$$ROOT', null] } },
      },
    },
    {
      $project: {
        absences: { $filter: { input: '$absences', as: 'event', cond: { $ne: ['$$event', null] } } },
        eventsPerDay: { $filter: { input: '$eventsPerDay', as: 'event', cond: { $ne: ['$$event', null] } } },
      },
    },
    {
      $group: {
        _id: { auxiliary: '$_id.auxiliary' },
        events: { $push: '$eventsPerDay' },
        absences: { $push: '$absences' },
      },
    },
    {
      $project: {
        auxiliary: '$_id.auxiliary',
        events: 1,
        absences: { $reduce: { input: '$absences', initialValue: [], in: { $setUnion: ['$$value', '$$this'] } } },
      },
    },
  ])
    .option({ company: companyId });
};

exports.getEventsToBill = async (query, companyId) => {
  const rules = [];
  if (has(query, 'eventIds')) rules.push({ _id: { $in: query.eventIds.map(id => new ObjectId(id)) } });
  else {
    rules.push(
      { endDate: { $lt: query.endDate } },
      { $or: [{ isBilled: false }, { isBilled: { $exists: false } }] },
      { auxiliary: { $exists: true, $ne: '' } },
      { type: INTERVENTION },
      { 'cancel.condition': { $not: { $eq: NOT_INVOICED_AND_NOT_PAID } } }
    );
    if (query.startDate) rules.push({ startDate: { $gte: query.startDate } });
    if (query.customer) rules.push({ customer: new ObjectId(query.customer) });
  }

  return Event.aggregate([
    { $match: { $and: rules } },
    { $lookup: { from: 'contracts', as: 'contracts', localField: 'auxiliary', foreignField: 'user' } },
    {
      $addFields: {
        contract: {
          $filter: {
            input: '$contracts',
            as: 'c',
            cond: {
              $and: [
                { $lte: ['$$c.startDate', '$startDate'] },
                { $gte: [{ $ifNull: ['$$c.endDate', query.endDate] }, '$startDate'] },
              ],
            },
          },
        },
      },
    },
    { $unwind: { path: '$contract' } },
    {
      $group: {
        _id: { SUBS: '$subscription', CUSTOMER: '$customer' },
        count: { $sum: 1 },
        events: { $push: '$$ROOT' },
      },
    },
    {
      $lookup: {
        from: 'customers',
        as: 'customer',
        let: { customerId: '$_id.CUSTOMER' },
        pipeline: [{ $match: { $and: [{ $expr: { $eq: ['$_id', '$$customerId'] }, archivedAt: { $eq: null } }] } }],
      },
    },
    { $unwind: { path: '$customer' } },
    {
      $addFields: {
        sub: { $filter: { input: '$customer.subscriptions', as: 'sub', cond: { $eq: ['$$sub._id', '$_id.SUBS'] } } },
      },
    },
    { $unwind: { path: '$sub' } },
    { $lookup: { from: 'services', localField: 'sub.service', foreignField: '_id', as: 'sub.service' } },
    { $unwind: { path: '$sub.service' } },
    {
      $addFields: {
        fund: {
          $filter: { input: '$customer.fundings', as: 'fund', cond: { $eq: ['$$fund.subscription', '$_id.SUBS'] } },
        },
      },
    },
    {
      $project: {
        idCustomer: '$_id.CUSTOMER',
        subId: '$_id.SUBS',
        events: { startDate: 1, subscription: 1, endDate: 1, auxiliary: 1, _id: 1, isCancelled: 1 },
        customer: 1,
        sub: 1,
        fund: 1,
      },
    },
    {
      $group: {
        _id: '$idCustomer',
        customer: { $addToSet: '$customer' },
        eventsBySubscriptions: {
          $push: { subscription: '$sub', eventsNumber: { $size: '$events' }, events: '$events', fundings: '$fund' },
        },
      },
    },
    { $unwind: { path: '$customer' } },
    {
      $project: {
        _id: 0,
        customer: { _id: 1, identity: 1, driveFolder: 1 },
        eventsBySubscriptions: 1,
      },
    },
    { $sort: { 'customer.identity.lastname': 1 } },
  ]).option({ company: companyId });
};

exports.getCustomersWithBilledEvents = async (query, companyId) => Event.aggregate([
  { $match: query },
  { $group: { _id: { SUBS: '$subscription', CUSTOMER: '$customer', TPP: '$bills.thirdPartyPayer' } } },
  {
    $lookup: {
      from: 'customers',
      as: 'customer',
      let: { customerId: '$_id.CUSTOMER' },
      pipeline: [{ $match: { $and: [{ archivedAt: { $eq: null } }, { $expr: { $eq: ['$_id', '$$customerId'] } }] } }],
    },
  },
  { $unwind: { path: '$customer' } },
  { $lookup: { from: 'thirdpartypayers', localField: '_id.TPP', foreignField: '_id', as: 'thirdPartyPayer' } },
  { $unwind: { path: '$thirdPartyPayer', preserveNullAndEmptyArrays: true } },
  {
    $addFields: {
      sub: { $filter: { input: '$customer.subscriptions', as: 'sub', cond: { $eq: ['$$sub._id', '$_id.SUBS'] } } },
    },
  },
  { $unwind: { path: '$sub' } },
  { $lookup: { from: 'services', localField: 'sub.service', foreignField: '_id', as: 'sub.service' } },
  { $unwind: { path: '$sub.service' } },
  {
    $addFields: {
      'sub.service.version': {
        $arrayElemAt: [
          '$sub.service.versions',
          { $indexOfArray: ['$sub.service.versions.startDate', { $max: '$sub.service.versions.startDate' }] },
        ],
      },
    },
  },
  {
    $lookup: {
      from: 'surcharges',
      localField: 'sub.service.version.surcharge',
      foreignField: '_id',
      as: 'sub.service.version.surcharge',
    },
  },
  { $unwind: { path: '$sub.service.version.surcharge', preserveNullAndEmptyArrays: true } },
  { $addFields: { 'sub.service.exemptFromCharges': '$sub.service.version.exemptFromCharges' } },
  { $addFields: { 'sub.service.name': '$sub.service.version.name' } },
  { $addFields: { 'sub.service.startDate': '$sub.service.version.startDate' } },
  { $addFields: { 'sub.service.defaultUnitAmount': '$sub.service.version.defaultUnitAmount' } },
  { $addFields: { 'sub.service.vat': '$sub.service.version.vat' } },
  { $addFields: { 'sub.service.surcharge': '$sub.service.version.surcharge' } },
  { $project: { 'sub.service.versions': 0, 'sub.service.version': 0 } },
  {
    $group: {
      _id: { CUS: '$customer' },
      subscriptions: { $addToSet: '$sub' },
      thirdPartyPayers: { $addToSet: '$thirdPartyPayer' },
    },
  },
  {
    $project: {
      _id: '$_id.CUS._id',
      subscriptions: 1,
      identity: '$_id.CUS.identity',
      thirdPartyPayers: 1,
    },
  },
]).option({ company: companyId });

exports.getCustomersWithIntervention = async companyId => Event.aggregate([
  { $match: { type: INTERVENTION, $or: [{ isBilled: false }, { isBilled: { $exists: false } }] } },
  { $group: { _id: { customer: '$customer' } } },
  { $lookup: { from: 'customers', localField: '_id.customer', foreignField: '_id', as: 'customer' } },
  { $unwind: { path: '$customer' } },
  { $replaceRoot: { newRoot: '$customer' } },
  { $project: { _id: 1, identity: { firstname: 1, lastname: 1 }, stoppedAt: 1, archivedAt: 1 } },
]).option({ company: companyId });

exports.getTaxCertificateInterventions = async (taxCertificate, companyId) => {
  const startDate = moment(taxCertificate.year, 'YYYY').startOf('year').toDate();
  const endDate = moment(taxCertificate.year, 'YYYY').endOf('year').toDate();
  const { _id: customerId, subscriptions } = taxCertificate.customer;

  const events = await Event.aggregate([
    {
      $match: {
        customer: customerId,
        startDate: { $lt: endDate },
        endDate: { $gte: startDate },
        $or: [{ isCancelled: false }, { 'cancel.condition': { $in: [INVOICED_AND_PAID, INVOICED_AND_NOT_PAID] } }],
      },
    },
    {
      $group: {
        _id: { auxiliary: '$auxiliary', month: { $month: '$startDate' }, sub: '$subscription' },
        eventList: { $push: { startDate: '$startDate', endDate: '$endDate' } },
      },
    },
    { $lookup: { from: 'users', as: 'auxiliary', localField: '_id.auxiliary', foreignField: '_id' } },
    { $unwind: '$auxiliary' },
    {
      $addFields: {
        subscription: { $filter: { input: subscriptions, as: 'sub', cond: { $eq: ['$$sub._id', '$_id.sub'] } } },
      },
    },
    { $unwind: '$subscription' },
    {
      $project: {
        auxiliary: { _id: 1, identity: 1, createdAt: 1, serialNumber: 1 },
        month: '$_id.month',
        subscription: 1,
        eventList: 1,
      },
    },
    { $sort: { month: 1 } },
  ]).option({ company: companyId });

  const formattedEvents = events.map(ev => ({
    ...ev,
    duration: parseFloat(ev.eventList.reduce((acc, event) =>
      NumbersHelper.add(
        acc,
        CompaniDuration(CompaniDate(event.endDate).oldDiff(event.startDate, 'minutes')).asHours()
      ), NumbersHelper.toString(0))),
  }));

  return formattedEvents;
};

exports.getEventsByDayAndAuxiliary = async (startDate, endDate, companyId) => Event.aggregate([
  {
    $match: {
      startDate: { $gte: startDate },
      endDate: { $lte: endDate },
      auxiliary: { $exists: true },
      $or: [{ isCancelled: false }, { 'cancel.condition': { $in: [INVOICED_AND_PAID] } }],
      type: { $in: [INTERNAL_HOUR, INTERVENTION] },
    },
  },
  {
    $project: {
      auxiliary: 1,
      startDate: 1,
      endDate: 1,
      address: 1,
      transportMode: 1,
      hasFixedService: 1,
      company: 1,
    },
  },
  {
    $group: {
      _id: {
        auxiliary: '$auxiliary',
        month: { $month: '$startDate' },
        day: { $dayOfMonth: '$startDate' },
      },
      eventsByDay: { $push: '$$ROOT' },
    },
  },
  {
    $group: {
      _id: { auxiliary: '$_id.auxiliary' },
      auxiliary: { $first: '$_id.auxiliary' },
      eventsByDay: { $push: '$eventsByDay' },
    },
  },
  { $lookup: { from: 'users', as: 'auxiliary', localField: 'auxiliary', foreignField: '_id' } },
  { $unwind: { path: '$auxiliary' } },
  {
    $project: {
      auxiliary: { _id: 1, identity: { firstname: 1, lastname: 1 }, administrative: 1 },
      eventsByDay: 1,
    },
  },
]).option({ company: companyId });
