const { ObjectID } = require('mongodb');
const moment = require('moment');
const Customer = require('../models/Customer');
const { HOURLY, MONTHLY } = require('../helpers/constants');

exports.getFundingMonitoring = async (customerId) => {
  const matchAndPopulateFundings = [
    {
      $match:
      {
        _id: new ObjectID(customerId),
        fundings: {
          $elemMatch: {
            frequency: MONTHLY,
            nature: HOURLY,
            versions: {
              $elemMatch: {
                startDate: { $lte: moment().endOf('month').toDate() },
                $or: [
                  { endDate: { $exists: false } },
                  { endDate: { $gte: moment().startOf('month').toDate() } },
                ],
              },
            },
          },
        },
      },
    },
    { $unwind: { path: '$fundings' } },
    {
      $lookup: {
        from: 'thirdpartypayers',
        localField: 'fundings.thirdPartyPayer',
        foreignField: '_id',
        as: 'fundings.thirdPartyPayer',
      },
    },
    { $unwind: { path: '$fundings.thirdPartyPayer' } },
    { $unwind: { path: '$subscriptions' } },
    {
      $lookup: {
        from: 'services',
        localField: 'subscriptions.service',
        foreignField: '_id',
        as: 'fundings.service',
      },
    },
    { $unwind: { path: '$fundings.service' } },
    {
      $project: {
        _id: 1,
        subscriptions: {
          _id: 1,
        },
        fundings: {
          thirdPartyPayer: {
            name: 1,
          },
          versions: 1,
          service: {
            versions: {
              name: 1,
            },
          },
        },
      },
    },
  ];

  const matchAndPopulateEvents = [
    {
      $lookup: {
        from: 'events',
        as: 'events',
        let: {
          subscriptionId: '$subscriptions._id',
          customerId: '$_id',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$customer', '$$customerId'] },
                  { $eq: ['$subscription', '$$subscriptionId'] },
                  { $eq: ['$type', 'intervention'] },
                  {
                    $gt: [
                      '$startDate', moment()
                        .subtract(2, 'month')
                        .endOf('month')
                        .endOf('day')
                        .toDate(),
                    ],
                  },
                  { $lte: ['$startDate', moment().endOf('month').toDate()] },
                ],
              },
            },
          },
        ],
      },
    },
    { $unwind: { path: '$events' } },
  ];

  const group = [
    {
      $group: {
        _id: {
          month: { $dateToString: { format: '%Y-%m', date: '$events.startDate' } },
          funding: '$fundings',
        },
        events: { $push: '$events' },
      },
    },
    {
      $group: {
        _id: '$_id.funding',
        eventsByMonth: {
          $push: {
            date: '$_id.month',
            events: '$events',
          },
        },
      },
    },
  ];

  return Customer.aggregate([
    ...matchAndPopulateFundings,
    ...matchAndPopulateEvents,
    ...group,
  ]);
};
