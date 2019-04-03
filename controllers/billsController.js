const Boom = require('boom');
const { ObjectID } = require('mongodb');

const Event = require('../models/Event');
const Bill = require('../models/Bill');
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
/**
 * TODO
 * 1. Créer la facture
 * 2. passer les evenements en `isBilled: true`
 * 3. Sauvegarder les historiques de financements
 * 4. Gestion du cas avec facture tiers
 */
const createBills = (req) => {
  try {
    const promises = [];
    for (const groupByCustomerBills of req.payload.bills) {
      const customerBill = { customer: groupByCustomerBills.customer._id, subscriptions: [] };
      for (const draftBill of groupByCustomerBills.customerBills.bills) {
        customerBill.subscriptions.push({
          ...draftBill,
          subscription: draftBill.subscription._id,
          events: draftBill.eventsList.map(ev => ev.event),
        });
      }
      promises.push((new Bill(customerBill)).save());

      if (groupByCustomerBills.thirdPartyPayerBills && groupByCustomerBills.thirdPartyPayerBills.length > 0) {
        for (const tpp of groupByCustomerBills.thirdPartyPayerBills) {
          const tppBill = {
            customer: groupByCustomerBills.customer._id,
            client: tpp.bills[0].thirdPartyPayer,
            subscriptions: []
          };
          for (const draftBill of tpp.bills) {
            tppBill.subscriptions.push({
              ...draftBill,
              subscription: draftBill.subscription._id,
              events: draftBill.eventsList,
            });
          }
          promises.push((new Bill(tppBill)).save());
        }
      }
    }
    Promise.all(promises);

    return {};
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

module.exports = {
  draftBillsList,
  createBills,
};
