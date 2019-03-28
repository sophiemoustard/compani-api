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
          events: { $push: '$$ROOT' }
        }
      },
      { $lookup: { from: 'customers', localField: '_id.CUSTOMER', foreignField: '_id', as: 'customer' } },
      { $unwind: { path: '$customer' } },
      {
        $addFields: {
          sub: {
            $filter: { input: '$customer.subscriptions', as: 'sub', cond: { $eq: ['$$sub._id', '$_id.SUBS'] } },
          }
        }
      },
      { $unwind: { path: '$sub' } },
      { $lookup: { from: 'services', localField: 'sub.service', foreignField: '_id', as: 'sub.service'} },
      { $unwind: { path: '$sub.service' } },
      {
        $project: {
          idCustomer: '$_id.CUSTOMER',
          subId: '$_id.SUBS',
          events: { startDate: 1, subscription: 1, endDate: 1, _id: 1 },
          customer: 1,
          sub: 1
        }
      },
      {
        $group: {
          _id: '$idCustomer',
          customer: { $addToSet: '$customer' },
          eventsBySubscriptions: {
            $push: { subscription: '$sub', eventsNumber: { $size: '$events' }, events: '$events' },
          }
        }
      },
      { $unwind: { path: '$customer' } },
      {
        $project: {
          _id: 0,
          customer: { _id: 1, identity: 1, fundings: 1 },
          eventsBySubscriptions: 1,
        }
      }
    ]);

    const draftBills = await getDraftBillsList(eventsToBill, req.query);

    return {
      message: translate[language].draftBills,
      data: { draftBills },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

module.exports = {
  draftBillsList,
};
