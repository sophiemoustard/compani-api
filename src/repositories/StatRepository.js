const moment = require('moment');
const { ObjectID } = require('mongodb');
const Customer = require('../models/Customer');
const { HOURLY, MONTHLY, INVOICED_AND_PAID, INVOICED_AND_NOT_PAID, INTERVENTION } = require('../helpers/constants');

exports.getEventsGroupedByFundings = async (customerId, fundingsDate, eventsDate, splitEventsDate) => {
  const fundingsMatch = {
    frequency: MONTHLY,
    nature: HOURLY,
    versions: {
      $elemMatch: {
        startDate: { $lte: fundingsDate.maxStartDate },
        $or: [
          { endDate: { $exists: false } },
          { endDate: { $gte: fundingsDate.minEndDate } },
        ],
      },
    },
  };

  const matchAndPopulateFundings = [
    { $match: { _id: new ObjectID(customerId), fundings: { $elemMatch: fundingsMatch } } },
    { $unwind: { path: '$fundings' } },
    { $replaceRoot: { newRoot: '$fundings' } },
    { $match: fundingsMatch },
    {
      $lookup: {
        from: 'thirdpartypayers',
        localField: 'thirdPartyPayer',
        foreignField: '_id',
        as: 'thirdPartyPayer',
      },
    },
    { $unwind: { path: '$thirdPartyPayer' } },
    { $addFields: { version: { $arrayElemAt: ['$versions', -1] } } },
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
        prevMonthEvents: { $filter: { input: '$events', as: 'event', cond: { $lt: ['$$event.startDate', splitEventsDate] } } },
        currentMonthEvents: { $filter: { input: '$events', as: 'event', cond: { $gte: ['$$event.startDate', splitEventsDate] } } },
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

  return Customer.aggregate([
    ...matchAndPopulateFundings,
    ...matchEvents,
    ...formatFundings,
  ]);
};
