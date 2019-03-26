const Boom = require('boom');
const { ObjectID } = require('mongodb');

const Event = require('../models/Event');
const translate = require('../helpers/translate');
const { INTERVENTION } = require('../helpers/constants');
const { getDraftBillsList } = require('../helpers/bills');

const { language } = translate;

const draftBillsList = async (req) => {
  try {
    const rules = [
      { endDate: { $lt: req.query.endDate } },
      { $or: [{ isBilled: false }, { isBilled: { $exists: false } }] },
      { type: INTERVENTION },
      { customer: new ObjectID('5c6431764a85340014894ee6') }
    ];
    const eventsToBill = await Event.aggregate([
      { $match: { $and: rules } },
      {
        $group: {
          _id: { SUBS: '$subscription', CUSTOMER: '$customer' },
          count: { $sum: 1 },
          hours: {
            $sum: {
              $divide: [{ $subtract: ['$endDate', '$startDate'] }, 3600000]
            }
          },
          events: { $push: '$$ROOT' }
        }
      },
      {
        $group: {
          _id: '$_id.CUSTOMER',
          subscriptions: {
            $push: {
              sub: '$_id.SUBS',
              hours: '$hours',
              eventsNumber: { $size: '$events' },
              events: '$events'
            }
          }
        }
      },
      {
        $lookup: {
          from: 'customers',
          localField: '_id',
          foreignField: '_id',
          as: 'customer'
        }
      },
      { $unwind: { path: '$customer' } },
      {
        $addFields: {
          'subscriptions.subscription': '$customer.subscriptions',
        }
      },
      {
        $project: {
          _id: 0,
          customer: { _id: 1, identity: 1, fundings: 1 },
          subscriptions: 1,
        }
      }
    ]);

    const draftBills = await getDraftBillsList(eventsToBill, req.query);


    return {
      message: translate[language].draftBills,
      data: { draftBills, eventsToBill },
    };
  } catch (e) {
    console.log(e);
    req.log('error', e);
    return Boom.badImplementation();
  }
};

module.exports = {
  draftBillsList,
};
