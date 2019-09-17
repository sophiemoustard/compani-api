const Customer = require('../models/Customer');

exports.getCustomerFundings = async () => Customer.aggregate([
  { $match: { fundings: { $exists: true, $not: { $size: 0 } } } },
  { $unwind: '$fundings' },
  {
    $addFields: {
      'fundings.subscription': {
        $filter: { input: '$subscriptions', as: 'sub', cond: { $eq: ['$$sub._id', '$fundings.subscription'] } },
      },
    },
  },
  { $unwind: '$fundings.subscription' },
  {
    $lookup: {
      from: 'services',
      localField: 'fundings.subscription.service',
      foreignField: '_id',
      as: 'fundings.subscription.service',
    },
  },
  { $unwind: { path: '$fundings.subscription.service' } },
  {
    $lookup: {
      from: 'thirdpartypayers',
      localField: 'fundings.thirdPartyPayer',
      foreignField: '_id',
      as: 'fundings.thirdPartyPayer',
    },
  },
  { $unwind: { path: '$fundings.thirdPartyPayer' } },
  {
    $project: { funding: '$fundings', identity: 1 },
  },
]);

exports.getCustomerAuxiliaries = async (customerId) => {
  const now = new Date();

  const aggregateHourlySubscriptions = [
    { $match: { _id: customerId } },
    { $unwind: { path: '$subscriptions' } },
    {
      $lookup: {
        from: 'services',
        localField: 'subscriptions.service',
        foreignField: '_id',
        as: 'service',
      },
    },
    { $unwind: { path: '$service' } },
    { $match: { 'service.nature': 'hourly' } },
    { $project: { subscriptionId: '$subscriptions._id' } },
  ];

  const aggregateEventsFromSubscriptions = [
    {
      $lookup: {
        from: 'events',
        as: 'events',
        let: { subscriptionId: '$subscriptionId', customerId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$customer', '$$customerId'] },
                  { $eq: ['$subscription', '$$subscriptionId'] },
                  { $eq: ['$type', 'intervention'] },
                  { $lte: ['$startDate', now] },
                ],
              },
            },
          },
        ],
      },
    },
    { $unwind: { path: '$events' } },
    { $replaceRoot: { newRoot: '$events' } },
    { $sort: { startDate: -1 } },
  ];

  const aggregateAuxiliariesFromEvents = [
    {
      $project: {
        duration: {
          $subtract: ['$endDate', '$startDate'],
        },
        startDate: 1,
        auxiliary: 1,
      },
    },
    {
      $group: {
        _id: '$auxiliary',
        events: { $push: '$$ROOT' },
      },
    },
    {
      $project: {
        totalDuration: { $sum: '$events.duration' },
        lastEvent: { $arrayElemAt: ['$events', 0] },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'auxiliary',
      },
    },
    { $unwind: { path: '$auxiliary' } },
    { $sort: { 'lastEvent.startDate': -1 } },
  ];

  return Customer.aggregate([
    ...aggregateHourlySubscriptions,
    ...aggregateEventsFromSubscriptions,
    ...aggregateAuxiliariesFromEvents,
  ]);
};
