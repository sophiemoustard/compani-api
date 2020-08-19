const moment = require('moment');
const Boom = require('@hapi/boom');
const pickBy = require('lodash/pickBy');
const get = require('lodash/get');
const pick = require('lodash/pick');
const map = require('lodash/map');
const isEqual = require('lodash/isEqual');
const Customer = require('../models/Customer');
const Event = require('../models/Event');
const translate = require('./translate');
const UtilsHelper = require('./utils');

const { language } = translate;

exports.populateService = (service) => {
  if (!service || service.version) return;

  const currentVersion = [...service.versions]
    .filter(version => moment(version.startDate).isSameOrBefore(new Date(), 'days'))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

  return { ...currentVersion, _id: service._id, nature: service.nature };
};

exports.populateSubscriptionsServices = (customer) => {
  if (!customer.subscriptions || customer.subscriptions.length === 0) return customer;
  const subscriptions = [];
  for (let i = 0, l = customer.subscriptions.length; i < l; i++) {
    subscriptions.push({
      ...customer.subscriptions[i],
      service: exports.populateService(customer.subscriptions[i].service),
    });
  }
  return { ...customer, subscriptions };
};

exports.subscriptionsAccepted = (customer) => {
  if (customer.subscriptions && customer.subscriptions.length > 0) {
    if (customer.subscriptionsHistory && customer.subscriptionsHistory.length > 0) {
      const subscriptions = map(customer.subscriptions, (subscription) => {
        const lastVersion = [...subscription.versions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
        const version = pickBy(pick(lastVersion, ['unitTTCRate', 'estimatedWeeklyVolume', 'evenings', 'sundays']));

        return { service: get(subscription, 'service.name'), ...version };
      });

      const lastSubscriptionHistory = UtilsHelper.getLastVersion(customer.subscriptionsHistory, 'approvalDate');
      const lastSubscriptions = lastSubscriptionHistory.subscriptions
        .map(sub => pick(sub, ['unitTTCRate', 'estimatedWeeklyVolume', 'evenings', 'sundays', 'service']));

      return { ...customer, subscriptionsAccepted: isEqual(subscriptions, lastSubscriptions) };
    }

    return { ...customer, subscriptionsAccepted: false };
  }
  return customer;
};

exports.updateSubscription = async (params, payload) => {
  const customer = await Customer.findOneAndUpdate(
    { _id: params._id, 'subscriptions._id': params.subscriptionId },
    { $push: { 'subscriptions.$.versions': payload } },
    { new: true, select: { identity: 1, subscriptions: 1 }, autopopulate: false }
  )
    .populate({ path: 'subscriptions.service', populate: { path: 'versions.surcharge' } })
    .lean();

  return exports.populateSubscriptionsServices(customer);
};

exports.addSubscription = async (customerId, payload) => {
  const customer = await Customer.findById(customerId).lean();
  if (customer.subscriptions && customer.subscriptions.length > 0) {
    const isServiceAlreadySubscribed = !!customer.subscriptions
      .find(subscription => subscription.service.toHexString() === payload.service);
    if (isServiceAlreadySubscribed) throw Boom.conflict(translate[language].serviceAlreadySubscribed);
  }

  const updatedCustomer = await Customer.findOneAndUpdate(
    { _id: customerId },
    { $push: { subscriptions: payload } },
    { new: true, select: { identity: 1, subscriptions: 1 }, autopopulate: false }
  )
    .populate({ path: 'subscriptions.service', populate: { path: 'versions.surcharge' } })
    .lean();

  return exports.populateSubscriptionsServices(updatedCustomer);
};

exports.deleteSubscription = async (customerId, subscriptionId) => {
  const eventsCount = await Event.countDocuments({ subscription: subscriptionId });
  if (eventsCount > 0) throw Boom.forbidden(translate[language].customerSubscriptionDeletionForbidden);

  await Customer.updateOne(
    { _id: customerId },
    { $pull: { subscriptions: { _id: subscriptionId } } }
  );
};

exports.createSubscriptionHistory = async (customerId, payload) => Customer.findOneAndUpdate(
  { _id: customerId },
  { $push: { subscriptionsHistory: payload } },
  { new: true, select: { identity: 1, subscriptionsHistory: 1 }, autopopulate: false }
).lean();
