const moment = require('moment');
const { ObjectID } = require('mongodb');
const Customer = require('../models/Customer');
const SectorHistory = require('../models/SectorHistory');
const {
  HOURLY,
  MONTHLY,
  INVOICED_AND_PAID,
  INVOICED_AND_NOT_PAID,
  INTERVENTION,
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
  {
    $lookup: {
      from: 'thirdpartypayers',
      localField: 'thirdPartyPayer',
      foreignField: '_id',
      as: 'thirdPartyPayer',
    },
  },
  { $unwind: { path: '$thirdPartyPayer' } },
];

const getMatchEvents = eventsDate => [
  {
    $lookup: {
      from: 'events',
      as: 'events',
      let: {
        subscriptionId: '$subscription',
        fundingStartDate: '$version.startDate',
        fundingEndDate: { $ifNull: ['$version.endDate', eventsDate.maxDate] },
      },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$subscription', '$$subscriptionId'] },
                { $eq: ['$type', INTERVENTION] },
                { $gte: ['$startDate', eventsDate.minDate] },
                { $gte: ['$startDate', '$$fundingStartDate'] },
                { $lte: ['$endDate', eventsDate.maxDate] },
                { $lte: ['$endDate', '$$fundingEndDate'] },
                {
                  $or: [
                    { $eq: ['$isCancelled', false] },
                    { $eq: ['$isCancelled', ['$exists', false]] },
                    { $eq: ['$cancel.condition', INVOICED_AND_PAID] },
                    { $eq: ['$cancel.condition', INVOICED_AND_NOT_PAID] },
                  ],
                },
              ],
            },
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

  const matchFundings = [
    { $match: { fundings: { $elemMatch: { ...fundingsMatch, versions: { $elemMatch: versionMatch } } } } },
    {
      $lookup: {
        from: 'users',
        localField: 'referent',
        foreignField: '_id',
        as: 'referent',
      },
    },
    { $unwind: { path: '$referent', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'sectors',
        localField: 'referent.sector',
        foreignField: '_id',
        as: 'sector',
      },
    },
    { $unwind: { path: '$sector', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$fundings' } },
    {
      $addFields: {
        'fundings.customer': '$identity',
        'fundings.referent': '$referent.identity',
        'fundings.sector': '$sector',
      },
    },
  ];

  const startOfMonth = moment().startOf('month').toDate();
  const endOfMonth = moment().endOf('month').toDate();
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
          $filter: {
            input: '$events',
            as: 'event',
            cond: { $gte: ['$$event.startDate', endOfMonth] },
          },
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
        unitTTCRate: '$version.unitTTCRate',
        customerParticipationRate: '$version.customerParticipationRate',
        prevMonthEvents: { startDate: 1, endDate: 1 },
        currentMonthEvents: { startDate: 1, endDate: 1 },
        nextMonthEvents: { startDate: 1, endDate: 1 },
        customer: { firstname: 1, lastname: 1 },
        referent: { firstname: 1, lastname: 1 },
        sector: '$sector.name',
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

exports.getCustomersAndDurationBySector = async (sectors, month, companyId) => {
  const minStartDate = moment(month, 'MMYYYY').startOf('month').toDate();
  const maxStartDate = moment(month, 'MMYYYY').endOf('month').toDate();

  return SectorHistory.aggregate([
    { $match: { sector: { $in: sectors } } },
    {
      $lookup: {
        from: 'users',
        as: 'auxiliary',
        localField: 'auxiliary',
        foreignField: '_id',
      },
    },
    { $unwind: { path: '$auxiliary' } },
    { $addFields: { 'auxiliary.sector': '$sector' } },
    { $replaceRoot: { newRoot: '$auxiliary' } },
    { $project: { _id: 1, sector: 1 } },
    {
      $lookup: {
        from: 'events',
        as: 'event',
        let: { auxiliaryId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$auxiliary', '$$auxiliaryId'] },
                  { $gte: ['$startDate', minStartDate] },
                  { $lt: ['$startDate', maxStartDate] },
                  { $eq: ['$type', INTERVENTION] },
                  {
                    $or: [
                      { $eq: ['$isCancelled', false] },
                      { $eq: ['$cancel.condition', INVOICED_AND_NOT_PAID] },
                      { $eq: ['$cancel.condition', INVOICED_AND_PAID] },
                    ],
                  },
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
        duration: { $divide: [{ $subtract: ['$event.endDate', '$event.startDate'] }, 1000 * 60 * 60] },
      },
    },
    {
      $group: {
        _id: { sector: '$sector', customer: '$event.customer' },
        duration: { $sum: '$duration' },
      },
    },
    {
      $group: {
        _id: '$_id.sector',
        duration: { $sum: '$duration' },
        customerCount: { $sum: 1 },
      },
    },
    {
      $project: {
        sector: '$_id',
        duration: 1,
        customerCount: 1,
      },
    },
  ]).option({ company: companyId });
};
