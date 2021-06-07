const Customer = require('../models/Customer');
const { populateReferentHistories } = require('./utils');

exports.getCustomerFundings = async companyId => Customer.aggregate([
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
  { $project: { funding: '$fundings', identity: 1 } },
]).option({ company: companyId });

exports.getCustomersWithSubscriptions = async (query, companyId) => Customer.aggregate([
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
  { $unwind: { path: '$subscriptions.service', preserveNullAndEmptyArrays: true } },
  { $unwind: { path: '$subscriptions.service.versions', preserveNullAndEmptyArrays: true } },
  { $sort: { 'subscriptions.service.versions.startDate': -1 } },
  {
    $group: {
      _id: { _id: '$_id', subscription: '$subscriptions._id' },
      customer: { $first: '$$ROOT' },
      serviceVersions: { $first: '$subscriptions.service.versions' },
    },
  },
  {
    $addFields: {
      'customer.subscriptions.service': { $mergeObjects: ['$serviceVersions', '$customer.subscriptions.service'] },
    },
  },
  { $replaceRoot: { newRoot: '$customer' } },
  { $group: { _id: '$_id', customer: { $first: '$$ROOT' }, subscriptions: { $push: '$subscriptions' } } },
  { $addFields: { 'customer.subscriptions': '$subscriptions' } },
  { $replaceRoot: { newRoot: '$customer' } },
  ...populateReferentHistories,
  {
    $project: {
      subscriptions: 1,
      referentHistories: 1,
      identity: 1,
      contact: 1,
      stoppedAt: 1,
    },
  },
]).option({ company: companyId });

exports.getSubscriptions = async (subscriptionsIds, companyId) => Customer.aggregate([
  { $match: { 'subscriptions._id': { $in: subscriptionsIds } } },
  { $unwind: { path: '$subscriptions' } },
  { $match: { 'subscriptions._id': { $in: subscriptionsIds } } },
]).option({ company: companyId });
