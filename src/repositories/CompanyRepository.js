const { ObjectID } = require('mongodb');
const get = require('lodash/get');
const Customer = require('../models/Customer');

exports.getCustomerFollowUp = async (customerId, credentials) => {
  const now = new Date();

  const aggregateHourlySubscriptions = [
    { $match: { _id: new ObjectID(customerId) } },
    { $unwind: { path: '$subscriptions' } },
    { $lookup: { from: 'services', localField: 'subscriptions.service', foreignField: '_id', as: 'service' } },
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
        durationMs: { $subtract: ['$endDate', '$startDate'] },
        startDate: 1,
        auxiliary: 1,
      },
    },
    { $group: { _id: '$auxiliary', events: { $push: '$$ROOT' } } },
    {
      $project: {
        totalDurationMs: { $sum: '$events.durationMs' },
        'lastEvent.startDate': { $arrayElemAt: ['$events.startDate', 0] },
      },
    },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'auxiliary' } },
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
        from: 'sectorhistories',
        as: 'sector',
        let: { auxiliaryId: '$_id', companyId: '$company' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$auxiliary', '$$auxiliaryId'] }, { $eq: ['$company', '$$companyId'] }],
              },
            },
          },
          { $sort: { startDate: -1 } },
          { $limit: 1 },
          { $lookup: { from: 'sectors', as: 'lastSector', foreignField: '_id', localField: 'sector' } },
          { $unwind: { path: '$lastSector' } },
          { $replaceRoot: { newRoot: '$lastSector' } },
        ],
      },
    },
    { $unwind: { path: '$sector' } },
    { $lookup: { from: 'roles', localField: 'role.client', foreignField: '_id', as: 'role.client' } },
    { $unwind: { path: '$role.client' } },
    { $lookup: { from: 'contracts', localField: 'contracts', foreignField: '_id', as: 'contracts' } },
  ];

  const pickFields = [{
    $project: {
      'picture.link': 1,
      'identity.firstname': 1,
      'identity.lastname': 1,
      sector: { name: '$sector.name' },
      totalHours: 1,
      'lastEvent.startDate': 1,
      // to compute isActive
      'role.client.name': 1,
      inactivityDate: 1,
      createdAt: 1,
      contracts: 1,
    },
  }];

  return Customer.aggregate([
    ...aggregateHourlySubscriptions,
    ...aggregateEventsFromSubscriptions,
    ...aggregateAuxiliariesFromEvents,
    ...lookup,
    ...pickFields,
  ]).option({ company: get(credentials, 'company._id') });
};
