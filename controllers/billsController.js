const moment = require('moment');
const Boom = require('boom');
const { ObjectID } = require('mongodb');
const _ = require('lodash');

const Event = require('../models/Event');
const translate = require('../helpers/translate');
const { INTERVENTION } = require('../helpers/constants');
const { getDraftBillsList } = require('../helpers/bills');
const { language } = translate;

const draftBillsList = async (req) => {
  try {
    const rules = [
      { endDate: { $lt: req.query.endDate } },
      { isBilled: false },
      { type: INTERVENTION },
      { customer: new ObjectID('5c6431764a85340014894ee6') }
    ];
    let eventsToBill = await Event.aggregate([
      { $match: { $and: rules } },
      { $lookup: { from: 'customers', localField: 'customer', foreignField: '_id', as: 'customer' } },
      { $unwind: { path : '$customer' } },
      { $lookup: { from: 'services', localField: 'customer.subscriptions.service', foreignField: '_id', as: 'service' } },
      { $unwind: { path : '$service' } },
      { $group: { _id: { CUS: '$customer._id', SUB: '$subscription' }, events: { $push: '$$ROOT' }, customer: { $addToSet: '$customer'}, services: { $addToSet: '$service'} } },
      { $project: {
        _id: 1,
        services: 1,
        customer: { _id: 1, identity: 1, subscriptions: 1, fundings: 1 },
        events: { startDate: 1, subscription: 1, endDate: 1, _id: 1 },
      }},
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