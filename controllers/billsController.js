const moment = require('moment');
const Boom = require('boom');
const { ObjectID } = require('mongodb');
const _ = require('lodash');

const Event = require('../models/Event');
const translate = require('../helpers/translate');
const { INTERVENTION } = require('../helpers/constants');
const { populateSubscriptionsServices } = require('../helpers/subscriptions');
const { language } = translate;

const getDraftBills = async (req) => {
  try {
    const rules = [
      { endDate: { $lt: req.query.endDate } },
      { isBilled: false },
      { type: INTERVENTION },
      { customer: new ObjectID('5c6431764a85340014894ee6') }
    ];
    let eventsToBill = await Event.aggregate([
      { $match: { $and: rules } },
      { $group: { _id: '$customer', events: { $push: '$$ROOT' } } },
      { $lookup: { from: 'customers', localField: '_id', foreignField: '_id', as: '_id' } },
      { $lookup: { from: 'services', localField: '_id.subscriptions.service', foreignField: '_id', as: 'service' } },
      { $unwind: { path : '$service' } },
      { $unwind: { path : '$_id' } },
      { $project: {
        '_id': { _id: 1, identity: 1, subscriptions: { _id: 1, versions: true, service: '$service' } },
        events: { startDate: 1, subscription: 1, endDate: 1, _id: 1 },
      }},
    ]);

    const draftBills = [];
    for (let i = 0, l = eventsToBill.length; i < l; i++) {
      const customer = await populateSubscriptionsServices(eventsToBill[i]._id);
      const eventsGroupBySub = _.groupBy(eventsToBill[i].events, 'subscription')

      for (const sub of Object.keys(eventsGroupBySub)) {
        const subscription = customer.subscriptions.find(s => s._id.toHexString() === sub);
        let minutes = 0;
        const eventsList = [];
        let preTaxePrice = 0;
        let startDate = req.query.endDate;
        for (const event of eventsGroupBySub[sub]) {
          const duration = moment(event.endDate).diff(moment(event.startDate), 'm');
          minutes += duration;
          preTaxePrice += duration / 60 * subscription.versions[0].unitTTCRate;
          if (moment(event.startDate).isBefore(startDate)) startDate = moment(event.startDate);
          eventsList.push(event._id);
        }

        draftBills.push({
          hours: minutes / 60,
          eventsList,
          subscription,
          identity: customer.identity,
          discount: 0,
          startDate: startDate.toDate(),
          endDate: moment(req.query.endDate, 'YYYYMMDD').toDate(),
          preTaxePrice,
        })
      }
    }

    return {
      message: translate[language].draftBills,
      data: { draftBills },
    };
  } catch (e) {
    console.log(e);
    req.log('error', e);
    return Boom.badImplementation();
  }
};

module.exports = {
  getDraftBills,
};