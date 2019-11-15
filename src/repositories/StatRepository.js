const { ObjectID } = require('mongodb');
const moment = require('moment');
const Customer = require('../models/Customer');
const { HOURLY, MONTHLY } = require('../helpers/constants');

exports.getFundingMonitoring = async customerId => Customer.aggregate([
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
  {
    $lookup: {
      from: 'events',
      localField: 'fundings.subscription',
      foreignField: 'subscription',
      as: 'events',
    },
  },
  { $unwind: { path: '$events' } },
  {
    $match: {
      'events.startDate': {
        $gt: moment()
          .subtract(2, 'month')
          .endOf('month')
          .endOf('day')
          .toDate(),
        $lte: moment().endOf('month').toDate(),
      },
    },
  },
  {
    $group: {
      _id: { funding: '$fundings' },
      events: { $push: '$events' },
    },
  },
]);
