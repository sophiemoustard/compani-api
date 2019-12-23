const moment = require('moment');
const { ObjectID } = require('mongodb');
const Customer = require('../models/Customer');
const User = require('../models/User');
const {
  HOURLY,
  MONTHLY,
  INVOICED_AND_PAID,
  INVOICED_AND_NOT_PAID,
  INTERVENTION,
} = require('../helpers/constants');

exports.getEventsGroupedByFundings = async (customerId, fundingsDate, eventsDate, splitEventsDate, companyId) => {
  const versionMatch = {
    startDate: { $lte: fundingsDate.maxStartDate },
    $or: [
      { endDate: { $exists: false } },
      { endDate: { $gte: fundingsDate.minEndDate } },
    ],
  };
  const fundingsMatch = {
    frequency: MONTHLY,
    nature: HOURLY,
  };

  const matchAndPopulateFundings = [
    {
      $match: {
        _id: new ObjectID(customerId),
        fundings: {
          $elemMatch: {
            ...fundingsMatch,
            versions: { $elemMatch: versionMatch },
          },
        },
      },
    },
    { $unwind: { path: '$fundings' } },
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

  const matchEvents = [
    {
      $lookup: {
        from: 'events',
        as: 'events',
        let: {
          subscriptionId: '$subscription',
          fundingStartDate: '$version.startDate',
          fundingEndDate: { $ifNull: ['$version.endDate', moment().endOf('month').toDate()] },
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$subscription', '$$subscriptionId'] },
                  { $eq: ['$type', INTERVENTION] },
                  { $gt: ['$startDate', eventsDate.minStartDate] },
                  { $gt: ['$startDate', '$$fundingStartDate'] },
                  { $lte: ['$startDate', eventsDate.maxStartDate] },
                  { $lte: ['$startDate', '$$fundingEndDate'] },
                  {
                    $or: [
                      ['$isCancelled', false],
                      ['$isCancelled', ['$exists', false]],
                      ['$cancel.condition', INVOICED_AND_PAID],
                      ['$cancel.condition', INVOICED_AND_NOT_PAID],
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

  const formatFundings = [
    {
      $addFields: {
        prevMonthEvents: {
          $filter: { input: '$events', as: 'event', cond: { $lt: ['$$event.startDate', splitEventsDate] } },
        },
        currentMonthEvents: {
          $filter: { input: '$events', as: 'event', cond: { $gte: ['$$event.startDate', splitEventsDate] } },
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
      ...matchAndPopulateFundings,
      ...matchEvents,
      ...formatFundings,
    ])
    .option({ company: companyId });
};

exports.getCustomersAndDurationBySector = async (sectors, month, companyId) => {
  const minStartDate = moment(month, 'MMYYYY').startOf('month').toDate();
  const maxStartDate = moment(month, 'MMYYYY').endOf('month').toDate();

  return User.aggregate([
    { $match: { sector: { $in: sectors } } },
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
