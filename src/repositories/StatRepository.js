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
                { endDate: { $gte: moment().subtract(2, 'month').endOf('month').toDate() } },
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
        $gte: moment().subtract(2, 'month').endOf('month').toDate(),
        $lte: moment().endOf('month').toDate(),
      },
    },
  },
  {
    $group: {
      _id: { $dateToString: { format: '%Y-%m', date: '$events.startDate' } },
      events: { $push: { funding: '$fundings', event: '$events' } },
    },
  },
]);
