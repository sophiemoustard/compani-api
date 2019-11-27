const moment = require('moment');
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

exports.getCustomerWithSubscriptions = async (company) => {
  const query = {
    subscriptions: { $exists: true, $ne: { $size: 0 } },
    company: company._id,
  };

  return Customer.aggregate([
    { $match: query },
    { $unwind: { path: '$subscriptions' } },
    {
      $lookup: {
        from: 'services',
        localField: 'subscriptions.service',
        foreignField: '_id',
        as: 'subscriptions.service',
      },
    },
    { $unwind: { path: '$subscriptions.service' } },
    { $unwind: { path: '$subscriptions.service.versions' } },
    {
      $match: { 'subscriptions.service.versions.startDate': { $lte: moment().startOf('d').toDate() } },
    },
    { $sort: { 'subscriptions.service.versions.startDate': -1 } },
    {
      $group: {
        _id: { _id: '$_id', subscription: 'subscriptions._id' },
        customer: { $first: '$$ROOT' },
        serviceVersions: { $first: '$subscriptions.service.versions' },
      },
    },
    {
      $addFields: {
        'customer.subscriptions.service': {
          $mergeObjects: ['$serviceVersions', '$customer.subscriptions.service'],
        },
      },
    },
    { $replaceRoot: { newRoot: '$customer' } },
    {
      $group: { _id: '$_id', customer: { $first: '$$ROOT' }, subscriptions: { $push: '$subscriptions' } },
    },
    { $addFields: { 'customer.subscriptions': '$subscriptions' } },
    { $replaceRoot: { newRoot: '$customer' } },
  ]);
};
