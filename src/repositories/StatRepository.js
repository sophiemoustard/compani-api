const moment = require('moment');
const { ObjectID } = require('mongodb');
const Customer = require('../models/Customer');
const Event = require('../models/Event');
const SectorHistory = require('../models/SectorHistory');
const {
  HOURLY,
  MONTHLY,
  INVOICED_AND_PAID,
  INVOICED_AND_NOT_PAID,
  INTERVENTION,
  INTERNAL_HOUR,
} = require('../helpers/constants');

const getVersionMatch = fundingsDate => ({
  startDate: { $lte: fundingsDate.maxStartDate },
  $or: [
    { endDate: { $exists: false } },
    { endDate: { $gte: fundingsDate.minEndDate } },
  ],
});

const getFundingsMatch = () => ({
  frequency: MONTHLY,
  nature: HOURLY,
});

const getPopulatedFundings = (fundingsMatch, fundingsDate) => [
  { $replaceRoot: { newRoot: '$fundings' } },
  { $addFields: { version: { $arrayElemAt: ['$versions', -1] } } },
  {
    $match: {
      ...fundingsMatch,
      'version.startDate': { $lte: fundingsDate.maxStartDate },
      $or: [
        { 'version.endDate': { $exists: false } },
        { 'version.endDate': { $gte: fundingsDate.minEndDate } },
      ],
    },
  },
  { $lookup: { from: 'thirdpartypayers', localField: 'thirdPartyPayer', foreignField: '_id', as: 'thirdPartyPayer' } },
  { $unwind: { path: '$thirdPartyPayer' } },
];

const getMatchEvents = eventsDate => [
  {
    $lookup: {
      from: 'events',
      as: 'events',
      let: { subscriptionId: '$subscription' },
      pipeline: [
        {
          $match: {
            $and: [
              { startDate: { $gte: eventsDate.minDate } },
              { endDate: { $lte: eventsDate.maxDate } },
              { type: INTERVENTION },
              { $expr: { $and: [{ $eq: ['$subscription', '$$subscriptionId'] }] } },
              {
                $or: [
                  { isCancelled: false },
                  { 'cancel.condition': INVOICED_AND_PAID },
                  { 'cancel.condition': INVOICED_AND_NOT_PAID },
                ],
              },
            ],
          },
        },
      ],
    },
  },
];

exports.getEventsGroupedByFundings = async (customerId, fundingsDate, eventsDate, companyId) => {
  const versionMatch = getVersionMatch(fundingsDate);
  const fundingsMatch = getFundingsMatch();

  const matchFundings = [
    {
      $match: {
        _id: new ObjectID(customerId),
        fundings: { $elemMatch: { ...fundingsMatch, versions: { $elemMatch: versionMatch } } },
      },
    },
    { $unwind: { path: '$fundings' } },
  ];

  const startOfMonth = moment().startOf('month').toDate();
  const formatFundings = [
    {
      $addFields: {
        prevMonthEvents: {
          $filter: { input: '$events', as: 'event', cond: { $lt: ['$$event.startDate', startOfMonth] } },
        },
        currentMonthEvents: {
          $filter: { input: '$events', as: 'event', cond: { $gte: ['$$event.startDate', startOfMonth] } },
        },
      },
    },
    {
      $project: {
        thirdPartyPayer: { name: 1 },
        subscription: 1,
        startDate: '$version.startDate',
        endDate: '$version.endDate',
        careHours: '$version.careHours',
        careDays: '$version.careDays',
        prevMonthEvents: { startDate: 1, endDate: 1 },
        currentMonthEvents: { startDate: 1, endDate: 1 },
      },
    },
  ];

  return Customer
    .aggregate([
      ...matchFundings,
      ...getPopulatedFundings(fundingsMatch, fundingsDate),
      ...getMatchEvents(eventsDate),
      ...formatFundings,
    ])
    .option({ company: companyId });
};

exports.getEventsGroupedByFundingsforAllCustomers = async (fundingsDate, eventsDate, companyId) => {
  const versionMatch = getVersionMatch(fundingsDate);
  const fundingsMatch = getFundingsMatch();
  const startOfMonth = moment().startOf('month').toDate();
  const endOfMonth = moment().endOf('month').toDate();

  const matchAndGroupEvents = [
    {
      $match: {
        startDate: { $gte: eventsDate.minDate, $lte: eventsDate.maxDate },
        type: INTERVENTION,
        $or: [
          { isCancelled: false },
          { 'cancel.condition': { $in: [INVOICED_AND_PAID, INVOICED_AND_NOT_PAID] } },
        ],
      },
    },
    { $project: { startDate: 1, endDate: 1, subscription: 1, customer: 1 } },
    { $group: { _id: { customer: '$customer' }, events: { $push: '$$ROOT' } } },
  ];

  const getCustomerWithFundings = [
    { $lookup: { from: 'customers', as: 'customer', foreignField: '_id', localField: '_id.customer' } },
    { $unwind: { path: '$customer' } },
    { $match: { 'customer.fundings': { $elemMatch: { ...fundingsMatch, versions: { $elemMatch: versionMatch } } } } },
    { $unwind: { path: '$customer.fundings' } },
    { $addFields: { 'customer.fundings.version': { $arrayElemAt: ['$customer.fundings.versions', -1] } } },
    {
      $match: {
        'customer.fundings.frequency': MONTHLY,
        'customer.fundings.nature': HOURLY,
        'customer.fundings.version.startDate': { $lte: fundingsDate.maxStartDate },
        $or: [
          { 'customer.fundings.version.endDate': { $exists: false } },
          { 'customer.fundings.version.endDate': { $exists: true, $gte: fundingsDate.minEndDate } },
        ],
      },
    },
    {
      $lookup: {
        from: 'thirdpartypayers',
        localField: 'customer.fundings.thirdPartyPayer',
        foreignField: '_id',
        as: 'customer.fundings.thirdPartyPayer',
      },
    },
    { $unwind: { path: '$customer.fundings.thirdPartyPayer' } },
    {
      $lookup: {
        from: 'referenthistories',
        as: 'customer.referent',
        let: { customerId: '$customer._id' },
        pipeline: [
          {
            $match: {
              $and: [
                { $or: [{ endDate: { $exists: false } }, { endDate: { $gte: moment().startOf('day').toDate() } }] },
                { startDate: { $lte: moment().endOf('day').toDate() } },
                { $expr: { $and: [{ $eq: ['$customer', '$$customerId'] }] } },
              ],
            },
          },
          { $sort: { startDate: -1 } },
          { $limit: 1 },
          { $lookup: { from: 'users', as: 'auxiliary', foreignField: '_id', localField: 'auxiliary' } },
          { $unwind: { path: '$auxiliary' } },
          { $replaceRoot: { newRoot: '$auxiliary' } },
          { $project: { identity: 1 } },
        ],
      },
    },
    { $unwind: { path: '$customer.referent', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'sectorhistories',
        as: 'customer.sector',
        localField: 'customer.referent._id',
        foreignField: 'auxiliary',
      },
    },
    { $unwind: { path: '$customer.sector', preserveNullAndEmptyArrays: true } },
    { $sort: { 'customer.sector.startDate': -1 } },
    {
      $group: {
        _id: { customer: '$_id.customer', funding: '$customer.fundings._id' },
        customer: { $first: '$customer' },
        events: { $first: '$events' },
        sectors: { $push: '$customer.sector' },
      },
    },
    { $addFields: { 'customer.sector': { $arrayElemAt: ['$sectors', 0] } } },
    { $lookup: { from: 'sectors', as: 'customer.sector', foreignField: '_id', localField: 'customer.sector.sector' } },
    { $unwind: { path: '$customer.sector', preserveNullAndEmptyArrays: true } },
  ];

  const formatFundings = [
    {
      $addFields: {
        prevMonthEvents: {
          $filter: { input: '$events', as: 'event', cond: { $lt: ['$$event.startDate', startOfMonth] } },
        },
        currentMonthEvents: {
          $filter: {
            input: '$events',
            as: 'event',
            cond: {
              $and: [{ $gte: ['$$event.startDate', startOfMonth] }, { $lte: ['$$event.startDate', endOfMonth] }],
            },
          },
        },
        nextMonthEvents: {
          $filter: { input: '$events', as: 'event', cond: { $gte: ['$$event.startDate', endOfMonth] } },
        },
      },
    },
    {
      $project: {
        month: '$_id.month',
        prevMonthEvents: 1,
        currentMonthEvents: 1,
        nextMonthEvents: 1,
        referent: {
          firstname: '$customer.referent.identity.firstname',
          lastname: '$customer.referent.identity.lastname',
        },
        customer: { firstname: '$customer.identity.firstname', lastname: '$customer.identity.lastname' },
        sector: { name: '$customer.sector.name', _id: '$customer.sector._id' },
        thirdPartyPayer: {
          name: '$customer.fundings.thirdPartyPayer.name',
          _id: '$customer.fundings.thirdPartyPayer._id',
        },
        subscription: '$customer.subscription',
        startDate: '$customer.fundings.version.startDate',
        endDate: '$customer.fundings.version.endDate',
        careHours: '$customer.fundings.version.careHours',
        careDays: '$customer.fundings.version.careDays',
        unitTTCRate: '$customer.fundings.version.unitTTCRate',
        customerParticipationRate: '$customer.fundings.version.customerParticipationRate',
      },
    },
  ];

  return Event.aggregate([
    ...matchAndGroupEvents,
    ...getCustomerWithFundings,
    ...formatFundings,
  ])
    .option({ company: companyId });
};

exports.getCustomersAndDurationBySector = async (sectors, month, companyId) => {
  const minStartDate = moment(month, 'MMYYYY').startOf('month').toDate();
  const maxStartDate = moment(month, 'MMYYYY').endOf('month').toDate();

  const sectorsCustomers = [
    {
      $match: {
        sector: { $in: sectors },
        startDate: { $lt: maxStartDate },
        $or: [{ endDate: { $exists: false } }, { endDate: { $gt: minStartDate } }],
      },
    },
    {
      $lookup: {
        from: 'referenthistories',
        as: 'histories',
        let: { referentId: '$auxiliary' },
        pipeline: [
          {
            $match: {
              $or: [{ endDate: { $exists: false } }, { endDate: { $exists: true, $gte: minStartDate } }],
              startDate: { $lte: maxStartDate },
              $and: [{ $expr: { $and: [{ $eq: ['$auxiliary', '$$referentId'] }] } }],
            },
          },
        ],
      },
    },
    { $unwind: { path: '$histories' } },
    {
      $project: {
        sector: 1,
        customer: '$histories.customer',
        startDate: { $max: ['$startDate', '$histories.startDate'] },
        endDate: { $min: ['$endDate', '$histories.endDate'] },
      },
    },
  ];

  const customersEvents = [
    {
      $lookup: {
        from: 'events',
        as: 'event',
        let: {
          customerId: '$customer',
          startDate: { $max: ['$startDate', minStartDate] },
          endDate: { $min: [{ $ifNull: ['$endDate', maxStartDate] }, maxStartDate] },
        },
        pipeline: [
          {
            $match: {
              $or: [
                { isCancelled: false },
                { 'cancel.condition': { $in: [INVOICED_AND_NOT_PAID, INVOICED_AND_PAID] } },
              ],
              $expr: {
                $and: [
                  { $eq: ['$customer', '$$customerId'] },
                  { $gt: ['$endDate', '$$startDate'] },
                  { $lt: ['$startDate', '$$endDate'] },
                ],
              },
            },
          },
        ],
      },
    },
    { $unwind: { path: '$event' } },
  ];

  const group = [
    { $addFields: { duration: { $divide: [{ $subtract: ['$event.endDate', '$event.startDate'] }, 1000 * 60 * 60] } } },
    {
      $group: {
        _id: { sector: '$sector', customer: '$event.customer' },
        duration: { $sum: '$duration' },
        auxiliaries: { $addToSet: '$event.auxiliary' },
      },
    },
    { $addFields: { auxiliaryCount: { $size: '$auxiliaries' } } },
    {
      $group: {
        _id: '$_id.sector',
        duration: { $sum: '$duration' },
        customerCount: { $sum: 1 },
        auxiliaryCount: { $sum: '$auxiliaryCount' },
      },
    },
    {
      $project: {
        sector: '$_id',
        averageDuration: { $divide: ['$duration', '$customerCount'] },
        customerCount: 1,
        auxiliaryTurnOver: { $divide: ['$auxiliaryCount', '$customerCount'] },
      },
    },
  ];

  return SectorHistory.aggregate([
    ...sectorsCustomers,
    ...customersEvents,
    ...group,
  ]).option({ company: companyId });
};

exports.getIntenalAndBilledHoursBySector = async (sectors, month, companyId) => {
  const minStartDate = moment(month, 'MMYYYY').startOf('month').toDate();
  const maxStartDate = moment(month, 'MMYYYY').endOf('month').toDate();

  return SectorHistory.aggregate([
    {
      $match: {
        sector: { $in: sectors },
        startDate: { $lt: maxStartDate },
        $or: [{ endDate: { $exists: false } }, { endDate: { $gt: minStartDate } }],
      },
    },
    {
      $lookup: {
        from: 'events',
        as: 'event',
        let: {
          auxiliaryId: '$auxiliary',
          startDate: { $max: ['$startDate', minStartDate] },
          endDate: { $min: [{ $ifNull: ['$endDate', maxStartDate] }, maxStartDate] },
        },
        pipeline: [
          {
            $match: {
              type: { $in: [INTERVENTION, INTERNAL_HOUR] },
              $or: [
                { isCancelled: false },
                { 'cancel.condition': { $in: [INVOICED_AND_NOT_PAID, INVOICED_AND_PAID] } },
              ],
              $expr: {
                $and: [
                  { $eq: ['$auxiliary', '$$auxiliaryId'] },
                  { $gt: ['$endDate', '$$startDate'] },
                  { $lt: ['$startDate', '$$endDate'] },
                ],
              },
            },
          },
        ],
      },
    },
    { $unwind: { path: '$event' } },
    {
      $addFields: {
        'event.duration': { $divide: [{ $subtract: ['$event.endDate', '$event.startDate'] }, 1000 * 60 * 60] },
      },
    },
    { $group: { _id: '$sector', events: { $push: '$event' } } },
    {
      $addFields: {
        internalHours: { $filter: { input: '$events', as: 'event', cond: { $eq: ['$$event.type', INTERNAL_HOUR] } } },
        interventions: { $filter: { input: '$events', as: 'event', cond: { $eq: ['$$event.type', INTERVENTION] } } },
      },
    },
    {
      $project: {
        sector: '$_id',
        internalHours: {
          $reduce: { input: '$internalHours', initialValue: 0, in: { $add: ['$$value', '$$this.duration'] } },
        },
        interventions: {
          $reduce: { input: '$interventions', initialValue: 0, in: { $add: ['$$value', '$$this.duration'] } },
        },
      },
    },
  ]).option({ company: companyId });
};
