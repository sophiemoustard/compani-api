const { ObjectID } = require('mongodb');
const omit = require('lodash/omit');
const get = require('lodash/get');
const Event = require('../models/Event');
const {
  INTERNAL_HOUR,
  INTERVENTION,
  ABSENCE,
  INVOICED_AND_PAID,
  COMPANY_CONTRACT,
  NOT_INVOICED_AND_NOT_PAID,
} = require('../helpers/constants');

const getEventsGroupedBy = async (rules, groupById) => Event.aggregate([
  { $match: rules },
  {
    $lookup: {
      from: 'users',
      localField: 'auxiliary',
      foreignField: '_id',
      as: 'auxiliary',
    },
  },
  { $unwind: { path: '$auxiliary', preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: 'customers',
      localField: 'customer',
      foreignField: '_id',
      as: 'customer',
    },
  },
  { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
  {
    $addFields: {
      subscription: {
        $filter: { input: '$customer.subscriptions', as: 'sub', cond: { $eq: ['$$sub._id', '$subscription'] } },
      },
    },
  },
  { $unwind: { path: '$subscription', preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: 'services',
      localField: 'subscription.service',
      foreignField: '_id',
      as: 'subscription.service',
    },
  },
  { $unwind: { path: '$subscription.service', preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: 'internalhours',
      localField: 'internalHour',
      foreignField: '_id',
      as: 'internalHour',
    },
  },
  { $unwind: { path: '$internalHour', preserveNullAndEmptyArrays: true } },
  {
    $project: {
      _id: 1,
      customer: { _id: 1, identity: 1, contact: 1 },
      auxiliary: {
        _id: 1,
        identity: 1,
        administrative: { driveFolder: 1, transportInvoice: 1 },
        company: 1,
        picture: 1,
      },
      type: 1,
      startDate: 1,
      endDate: 1,
      sector: 1,
      subscription: 1,
      internalHour: 1,
      absence: 1,
      absenceNature: 1,
      address: 1,
      misc: 1,
      attachment: 1,
      repetition: 1,
      isCancelled: 1,
      cancel: 1,
      isBilled: 1,
      bills: 1,
      status: 1,
    },
  },
  {
    $group: {
      _id: groupById,
      events: { $push: '$$ROOT' },
    },
  },
]);

exports.getEventsGroupedByAuxiliaries = async rules => getEventsGroupedBy(rules, { $ifNull: ['$auxiliary._id', '$sector'] });

exports.getEventsGroupedByCustomers = async rules => getEventsGroupedBy(rules, '$customer._id');

exports.getEventList = (rules, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  return Event.find(rules)
    .populate({
      path: 'auxiliary',
      select: 'identity administrative.driveFolder administrative.transportInvoice company picture sector',
      populate: { path: 'sector', match: { company: companyId } },
    })
    .populate({
      path: 'customer',
      select: 'identity subscriptions contact',
      populate: { path: 'subscriptions.service', match: { company: companyId } },
    })
    .populate({
      path: 'internalHour',
      match: { company: companyId },
    })
    .lean();
};

exports.getEventsInConflicts = async (dates, auxiliary, types, eventId) => {
  const rules = {
    startDate: { $lt: dates.endDate },
    endDate: { $gt: dates.startDate },
    auxiliary,
    type: { $in: types },
  };
  if (eventId) rules._id = { $ne: eventId };

  return Event.find(rules).lean();
};

exports.countAuxiliaryEventsBetweenDates = (filters) => {
  const dateQuery = {};
  if (filters.endDate) dateQuery.startDate = { $lt: filters.endDate };
  if (filters.startDate) dateQuery.endDate = { $gt: filters.startDate };

  const query = { ...dateQuery, ...omit(filters, ['startDate', 'endDate']) };

  return Event.countDocuments(query);
};

exports.getAuxiliaryEventsBetweenDates = (auxiliary, startDate, endDate, type) => {
  const query = {
    auxiliary,
    startDate: { $lt: endDate },
    endDate: { $gt: startDate },
  };
  if (type) query.type = type;

  return Event.find(query);
};

exports.getEvent = async event => Event.findOne({ _id: event._id })
  .populate({ path: 'auxiliary', select: 'identity administrative.driveFolder administrative.transportInvoice company' })
  .populate({ path: 'customer', select: 'identity subscriptions contact' })
  .lean();

exports.updateEvent = async (eventId, set, unset) => Event
  .findOneAndUpdate(
    { _id: eventId },
    { $set: set, ...(unset && { $unset: unset }) },
    { autopopulate: false, new: true }
  ).populate({
    path: 'auxiliary',
    select: 'identity administrative.driveFolder administrative.transportInvoice company picture',
  }).populate({ path: 'customer', select: 'identity subscriptions contact' })
  .lean();

exports.getWorkingEventsForExport = async (startDate, endDate) => {
  const rules = [
    { type: { $in: [INTERVENTION, INTERNAL_HOUR] } },
    {
      $or: [
        { startDate: { $lte: endDate, $gte: startDate } },
        { endDate: { $lte: endDate, $gte: startDate } },
        { endDate: { $gte: endDate }, startDate: { $lte: startDate } },
      ],
    },
  ];

  return Event.aggregate([
    { $match: { $and: rules } },
    {
      $lookup: {
        from: 'customers',
        localField: 'customer',
        foreignField: '_id',
        as: 'customer',
      },
    },
    { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        subscription: {
          $filter: { input: '$customer.subscriptions', as: 'sub', cond: { $eq: ['$$sub._id', '$subscription'] } },
        },
      },
    },
    { $unwind: { path: '$subscription', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'services',
        localField: 'subscription.service',
        foreignField: '_id',
        as: 'subscription.service',
      },
    },
    { $unwind: { path: '$subscription.service', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'users',
        localField: 'auxiliary',
        foreignField: '_id',
        as: 'auxiliary',
      },
    },
    { $unwind: { path: '$auxiliary', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'sectors',
        localField: 'sector',
        foreignField: '_id',
        as: 'sector',
      },
    },
    { $unwind: { path: '$sector' } },
    {
      $lookup: {
        from: 'internalhours',
        localField: 'internalHour',
        foreignField: '_id',
        as: 'internalHour',
      },
    },
    { $unwind: { path: '$internalHour', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        customer: { identity: 1 },
        auxiliary: { identity: 1 },
        startDate: 1,
        endDate: 1,
        internalHour: 1,
        subscription: 1,
        isCancelled: 1,
        isBilled: 1,
        cancel: 1,
        repetition: 1,
        sector: 1,
        misc: 1,
        type: 1,
      },
    },
    { $sort: { startDate: -1 } },
  ]);
};

exports.getAbsencesForExport = async (startDate, endDate, credentials) => {
  const query = {
    type: ABSENCE,
    $or: [
      { startDate: { $lte: endDate, $gte: startDate } },
      { endDate: { $lte: endDate, $gte: startDate } },
      { endDate: { $gte: endDate }, startDate: { $lte: startDate } },
    ],
  };

  return Event.find(query)
    .sort({ startDate: 'desc' })
    .populate({ path: 'auxiliary', select: 'identity' })
    .populate({ path: 'sector', match: { company: credentials.company._id } })
    .lean();
};

exports.getCustomerSubscriptions = contract => Event.aggregate([
  {
    $match: {
      $and: [
        { startDate: { $gt: new Date(contract.endDate) } },
        { auxiliary: new ObjectID(contract.user) },
        { $or: [{ isBilled: false }, { isBilled: { $exists: false } }] },
      ],
    },
  },
  {
    $group: {
      _id: { SUBS: '$subscription', CUSTOMER: '$customer' },
    },
  },
  {
    $lookup: {
      from: 'customers',
      localField: '_id.CUSTOMER',
      foreignField: '_id',
      as: 'customer',
    },
  },
  { $unwind: { path: '$customer' } },
  {
    $addFields: {
      sub: {
        $filter: { input: '$customer.subscriptions', as: 'sub', cond: { $eq: ['$$sub._id', '$_id.SUBS'] } },
      },
    },
  },
  { $unwind: { path: '$sub' } },
  {
    $lookup: {
      from: 'services',
      localField: 'sub.service',
      foreignField: '_id',
      as: 'sub.service',
    },
  },
  { $unwind: { path: '$sub.service' } },
  {
    $project: {
      _id: 0,
      customer: { _id: 1 },
      sub: 1,
    },
  },
]);

const getEventsGroupedByParentId = async rules => Event.aggregate([
  { $match: rules },
  {
    $group: {
      _id: { $ifNull: ['$repetition.parentId', null] },
      events: { $addToSet: '$$ROOT' },
    },
  },
  { $unwind: { path: '$events' } },
  { $sort: { 'events.startDate': 1 } },
  {
    $group: { _id: '$_id', events: { $push: '$events' } },
  },
]);


exports.getUnassignedInterventions = async (maxDate, auxiliary, subIds) => getEventsGroupedByParentId({ startDate: { $gt: maxDate }, auxiliary, subscription: { $in: subIds }, isBilled: false });

exports.getEventsExceptInterventions = async (startDate, auxiliary) => getEventsGroupedByParentId({ startDate: { $gt: startDate }, auxiliary, subscription: { $exists: false } });

exports.getAbsences = async (auxiliaryId, maxEndDate) => Event.find({
  type: ABSENCE,
  auxiliary: auxiliaryId,
  startDate: { $lte: maxEndDate },
  endDate: { $gt: maxEndDate },
});

exports.getEventsToPay = async (start, end, auxiliaries) => {
  const rules = [
    { startDate: { $lt: end } },
    { endDate: { $gt: start } },
    {
      $or: [
        {
          status: COMPANY_CONTRACT,
          type: INTERVENTION,
          $and: [{
            $or: [
              { isCancelled: false },
              { isCancelled: { $exists: false } },
              { 'cancel.condition': INVOICED_AND_PAID },
            ],
          }],
        },
        { type: { $in: [INTERNAL_HOUR, ABSENCE] } },
      ],
    },
    { auxiliary: { $in: auxiliaries } },
  ];

  const match = [
    { $match: { $and: rules } },
    {
      $lookup: {
        from: 'customers',
        localField: 'customer',
        foreignField: '_id',
        as: 'customer',
      },
    },
    { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        subscription: {
          $filter: { input: '$customer.subscriptions', as: 'sub', cond: { $eq: ['$$sub._id', '$$ROOT.subscription'] } },
        },
      },
    },
    { $unwind: { path: '$subscription', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'services',
        localField: 'subscription.service',
        foreignField: '_id',
        as: 'subscription.service',
      },
    },
    { $unwind: { path: '$subscription.service', preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        hasFixedService: {
          $cond: {
            if: { $and: [{ $eq: ['$type', 'intervention'] }, { $eq: ['$subscription.service.nature', 'fixed'] }] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $lookup: {
        from: 'internalhours',
        localField: 'internalHour',
        foreignField: '_id',
        as: 'internalHour',
      },
    },
    { $unwind: { path: '$internalHour', preserveNullAndEmptyArrays: true } },
  ];

  const group = [
    {
      $group: {
        _id: {
          aux: '$auxiliary',
          year: { $year: '$startDate' },
          month: { $month: '$startDate' },
          week: { $week: '$startDate' },
          day: { $dayOfWeek: '$startDate' },
        },
        eventsPerDay: { $push: { $cond: [{ $in: ['$type', ['internalHour', 'intervention']] }, '$$ROOT', null] } },
        absences: { $push: { $cond: [{ $eq: ['$type', 'absence'] }, '$$ROOT', null] } },
        auxiliary: { $first: '$auxiliary' },
      },
    },
    {
      $project: {
        auxiliary: 1,
        absences: { $filter: { input: '$absences', as: 'event', cond: { $ne: ['$$event', null] } } },
        eventsPerDay: { $filter: { input: '$eventsPerDay', as: 'event', cond: { $ne: ['$$event', null] } } },
      },
    },
    {
      $group: {
        _id: { auxiliary: '$auxiliary' },
        auxiliary: { $first: '$auxiliary' },
        events: { $push: '$eventsPerDay' },
        absences: { $push: '$absences' },
      },
    },
    {
      $project: {
        auxiliary: 1,
        events: 1,
        absences: {
          $reduce: {
            input: '$absences',
            initialValue: [],
            in: { $setUnion: ['$$value', '$$this'] },
          },
        },
      },
    },
  ];

  return Event.aggregate([
    ...match,
    ...group,
  ]);
};

exports.getAbsencesToPay = async (start, end, auxiliaries) => Event.aggregate([
  {
    $match: {
      type: ABSENCE,
      auxiliary: { $in: auxiliaries },
      $or: [
        { startDate: { $gte: start, $lt: end } },
        { endDate: { $gt: start, $lte: end } },
        { endDate: { $gte: end }, startDate: { $lte: start } },
      ],
    },
  },
  {
    $lookup: {
      from: 'users',
      localField: 'auxiliary',
      foreignField: '_id',
      as: 'auxiliary',
    },
  },
  { $unwind: { path: '$auxiliary' } },
  {
    $lookup: {
      from: 'sectors',
      localField: 'auxiliary.sector',
      foreignField: '_id',
      as: 'auxiliary.sector',
    },
  },
  { $unwind: { path: '$auxiliary.sector' } },
  {
    $lookup: {
      from: 'contracts',
      localField: 'auxiliary.contracts',
      foreignField: '_id',
      as: 'auxiliary.contracts',
    },
  },
  {
    $project: {
      auxiliary: {
        _id: 1,
        identity: { firstname: 1, lastname: 1 },
        sector: 1,
        contracts: 1,
        contact: 1,
        administrative: { mutualFund: 1, transportInvoice: 1 },
      },
      startDate: 1,
      endDate: 1,
      absenceNature: 1,
    },
  },
  { $group: { _id: '$auxiliary._id', events: { $push: '$$ROOT' } } },
]);

exports.getEventsToBill = async (dates, customerId) => {
  const rules = [
    { endDate: { $lt: dates.endDate } },
    { $or: [{ isBilled: false }, { isBilled: { $exists: false } }] },
    { auxiliary: { $exists: true, $ne: '' } },
    { type: INTERVENTION },
    { status: COMPANY_CONTRACT },
    { 'cancel.condition': { $not: { $eq: NOT_INVOICED_AND_NOT_PAID } } },
  ];
  if (dates.startDate) rules.push({ startDate: { $gte: dates.startDate } });
  if (customerId) rules.push({ customer: new ObjectID(customerId) });

  return Event.aggregate([
    { $match: { $and: rules } },
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
        localField: '_id.CUSTOMER',
        foreignField: '_id',
        as: 'customer',
      },
    },
    { $unwind: { path: '$customer' } },
    {
      $addFields: {
        sub: {
          $filter: { input: '$customer.subscriptions', as: 'sub', cond: { $eq: ['$$sub._id', '$_id.SUBS'] } },
        },
      },
    },
    { $unwind: { path: '$sub' } },
    {
      $lookup: {
        from: 'services',
        localField: 'sub.service',
        foreignField: '_id',
        as: 'sub.service',
      },
    },
    { $unwind: { path: '$sub.service' } },
    {
      $addFields: {
        fund: {
          $filter: {
            input: '$customer.fundings',
            as: 'fund',
            cond: { $eq: ['$$fund.subscription', '$_id.SUBS'] },
          },
        },
      },
    },
    {
      $project: {
        idCustomer: '$_id.CUSTOMER',
        subId: '$_id.SUBS',
        events: {
          startDate: 1,
          subscription: 1,
          endDate: 1,
          auxiliary: 1,
          _id: 1,
        },
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
          $push: {
            subscription: '$sub',
            eventsNumber: { $size: '$events' },
            events: '$events',
            fundings: '$fund',
          },
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
  ]);
};

exports.getCustomersFromEvent = async query => Event.aggregate([
  { $match: query },
  {
    $lookup: {
      from: 'customers',
      localField: 'customer',
      foreignField: '_id',
      as: 'customer',
    },
  },
  { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
  { $group: { _id: '$customer._id', customer: { $first: '$customer' } } },
  { $replaceRoot: { newRoot: '$customer' } },
  { $project: { subscriptions: 1, identity: 1 } },
  { $unwind: '$subscriptions' },
  {
    $lookup: {
      from: 'services',
      localField: 'subscriptions.service',
      foreignField: '_id',
      as: 'subscriptions.service',
    },
  },
  { $unwind: { path: '$subscriptions.service', preserveNullAndEmptyArrays: true } },
  {
    $addFields: {
      'subscriptions.service.version': {
        $arrayElemAt: [
          '$subscriptions.service.versions',
          {
            $indexOfArray: ['$subscriptions.service.versions.startDate', { $max: '$subscriptions.service.versions.startDate' }],
          },
        ],
      },
    },
  },
  {
    $lookup: {
      from: 'surcharges',
      localField: 'subscriptions.service.version.surcharge',
      foreignField: '_id',
      as: 'subscriptions.service.version.surcharge',
    },
  },
  { $unwind: { path: '$subscriptions.service.version.surcharge', preserveNullAndEmptyArrays: true } },
  { $addFields: { 'subscriptions.service.exemptFromCharges': '$subscriptions.service.version.exemptFromCharges' } },
  { $addFields: { 'subscriptions.service.name': '$subscriptions.service.version.name' } },
  { $addFields: { 'subscriptions.service.startDate': '$subscriptions.service.version.startDate' } },
  { $addFields: { 'subscriptions.service.defaultUnitAmount': '$subscriptions.service.version.defaultUnitAmount' } },
  { $addFields: { 'subscriptions.service.vat': '$subscriptions.service.version.vat' } },
  { $addFields: { 'subscriptions.service.surcharge': '$subscriptions.service.version.surcharge' } },
  {
    $project: {
      'subscriptions.service.versions': 0,
      'subscriptions.service.version': 0,
    },
  },
  {
    $group: { _id: '$_id', customer: { $first: '$$ROOT' }, subscriptions: { $push: '$subscriptions' } },
  },
  { $addFields: { 'customer.subscriptions': '$subscriptions' } },
  { $replaceRoot: { newRoot: '$customer' } },
]);

exports.getCustomerWithBilledEvents = async query => Event.aggregate([
  { $match: query },
  { $group: { _id: { SUBS: '$subscription', CUSTOMER: '$customer', TPP: '$bills.thirdPartyPayer' } } },
  {
    $lookup: {
      from: 'customers',
      localField: '_id.CUSTOMER',
      foreignField: '_id',
      as: 'customer',
    },
  },
  { $unwind: { path: '$customer' } },
  {
    $lookup: {
      from: 'thirdpartypayers',
      localField: '_id.TPP',
      foreignField: '_id',
      as: 'thirdPartyPayer',
    },
  },
  { $unwind: { path: '$thirdPartyPayer', preserveNullAndEmptyArrays: true } },
  {
    $addFields: {
      sub: {
        $filter: { input: '$customer.subscriptions', as: 'sub', cond: { $eq: ['$$sub._id', '$_id.SUBS'] } },
      },
    },
  },
  { $unwind: { path: '$sub' } },
  {
    $lookup: {
      from: 'services',
      localField: 'sub.service',
      foreignField: '_id',
      as: 'sub.service',
    },
  },
  { $unwind: { path: '$sub.service' } },
  {
    $addFields: {
      'sub.service.version': {
        $arrayElemAt: [
          '$sub.service.versions',
          {
            $indexOfArray: ['$sub.service.versions.startDate', { $max: '$sub.service.versions.startDate' }],
          },
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
  {
    $project: {
      'sub.service.versions': 0,
      'sub.service.version': 0,
    },
  },
  { $group: { _id: { CUS: '$customer' }, subscriptions: { $addToSet: '$sub' }, thirdPartyPayers: { $addToSet: '$thirdPartyPayer' } } },
  {
    $project: {
      _id: '$_id.CUS._id',
      subscriptions: 1,
      identity: '$_id.CUS.identity',
      thirdPartyPayers: 1,
    },
  },
]);
