const Boom = require('boom');
const { ObjectID } = require('mongodb');
const moment = require('moment');

const Event = require('../models/Event');
const BillNumber = require('../models/BillNumber');
const Bill = require('../models/Bill');
const translate = require('../helpers/translate');
const { INTERVENTION } = require('../helpers/constants');
const { getDraftBillsList } = require('../helpers/draftBills');
const { formatAndCreateBills } = require('../helpers/bills');

const { language } = translate;

const draftBillsList = async (req) => {
  try {
    const rules = [
      { endDate: { $lt: req.query.endDate } },
      { $or: [{ isBilled: false }, { isBilled: { $exists: false } }] },
      { $or: [{ isCancelled: false }, { isCancelled: { $exists: false } }] },
      { type: INTERVENTION },
    ];
    if (req.query.startDate) rules.push({ startDate: { $gte: req.query.startDate } });
    if (req.query.customer) rules.push({ customer: new ObjectID(req.query.customer) });

    const eventsToBill = await Event.aggregate([
      { $match: { $and: rules } },
      {
        $group: {
          _id: { SUBS: '$subscription', CUSTOMER: '$customer' },
          count: { $sum: 1 },
          events: { $push: '$$ROOT' }
        }
      },
      {
        $lookup: {
          from: 'customers',
          localField: '_id.CUSTOMER',
          foreignField: '_id',
          as: 'customer'
        }
      },
      { $unwind: { path: '$customer' } },
      {
        $addFields: {
          sub: {
            $filter: { input: '$customer.subscriptions', as: 'sub', cond: { $eq: ['$$sub._id', '$_id.SUBS'] } },
          }
        }
      },
      { $unwind: { path: '$sub' } },
      {
        $lookup: {
          from: 'services',
          localField: 'sub.service',
          foreignField: '_id',
          as: 'sub.service',
        }
      },
      { $unwind: { path: '$sub.service' } },
      {
        $addFields: {
          fund: {
            $filter: {
              input: '$customer.fundings',
              as: 'fund',
              cond: { $eq: ['$$fund.subscription', '$_id.SUBS'] }
            },
          }
        }
      },
      {
        $project: {
          idCustomer: '$_id.CUSTOMER',
          subId: '$_id.SUBS',
          events: { startDate: 1, subscription: 1, endDate: 1, _id: 1 },
          customer: 1,
          sub: 1,
          fund: 1,
        }
      },
      {
        $group: {
          _id: '$idCustomer',
          customer: { $addToSet: '$customer' },
          eventsBySubscriptions: {
            $push: {
              subscription: '$sub',
              eventsNumber: { $size: '$events' },
              events: '$events',
              fundings: '$fund',
            },
          }
        }
      },
      { $unwind: { path: '$customer' } },
      {
        $project: {
          _id: 0,
          customer: { _id: 1, identity: 1, driveFolder: 1 },
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

const createBills = async (req) => {
  try {
    const prefix = `FACT${moment().format('MMYY')}`;
    const number = await BillNumber.findOneAndUpdate(
      { prefix },
      {},
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await formatAndCreateBills(number, req.payload.bills);

    return { message: translate[language].billsCreated };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const list = async (req) => {
  try {
    const { startDate, endDate, ...rest } = req.query;
    const query = rest;
    if (startDate || endDate) {
      let date = {};
      if (startDate && endDate) date = { $lt: endDate, $gte: startDate };
      else if ( startDate) date = { $gte: startDate }
      else date = { $lt: endDate };
      query.date = date;
    }

    const bills = await Bill.find(query).populate({ path: 'customer', select: '_id identity' });

    if (!bills) return Boom.notFound(translate[language].billsNotFound);

    return {
      message: translate[language].billsFound,
      data: { bills }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

module.exports = {
  draftBillsList,
  createBills,
  list,
};
