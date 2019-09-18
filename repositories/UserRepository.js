const { ObjectID } = require('mongodb');
const Customer = require('../models/Customer');

exports.getAuxiliariesForCustomerFromHourlyEvents = async (customerId) => {
  const now = new Date();

  const aggregateHourlySubscriptions = [
    { $match: { _id: new ObjectID(customerId) } },
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
        durationMs: {
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
        totalDurationMs: { $sum: '$events.durationMs' },
        'lastEvent.startDate': { $arrayElemAt: ['$events.startDate', 0] },
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
    {
      $addFields: {
        'auxiliary.lastEvent': '$lastEvent',
        'auxiliary.totalHours': { $divide: ['$totalDurationMs', 1000 * 60 * 60] },
      },
    },
    { $replaceRoot: { newRoot: '$auxiliary' } },
    { $sort: { 'lastEvent.startDate': -1 } },
  ];

  // roles and contracts are required to compute isActive
  const lookup = [
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
        from: 'roles',
        localField: 'role',
        foreignField: '_id',
        as: 'role',
      },
    },
    { $unwind: { path: '$role' } },
    {
      $lookup: {
        from: 'contracts',
        localField: 'contracts',
        foreignField: '_id',
        as: 'contracts',
      },
    },
  ];

  return Customer.aggregate([
    ...aggregateHourlySubscriptions,
    ...aggregateEventsFromSubscriptions,
    ...aggregateAuxiliariesFromEvents,
    ...lookup,
  ]);
};
