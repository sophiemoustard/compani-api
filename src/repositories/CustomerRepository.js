const Customer = require('../models/Customer');

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

exports.getSubscriptions = async (subscriptionsIds, companyId) => Customer.aggregate([
  { $match: { 'subscriptions._id': { $in: subscriptionsIds } } },
  { $unwind: { path: '$subscriptions' } },
  { $match: { 'subscriptions._id': { $in: subscriptionsIds } } },
]).option({ company: companyId });
