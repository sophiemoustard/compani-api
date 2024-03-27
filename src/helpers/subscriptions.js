const moment = require('moment');
const Boom = require('@hapi/boom');
const pick = require('lodash/pick');
const omit = require('lodash/omit');
const pickBy = require('lodash/pickBy');
const get = require('lodash/get');
const map = require('lodash/map');
const isEqual = require('lodash/isEqual');
const Customer = require('../models/Customer');
const translate = require('./translate');
const UtilsHelper = require('./utils');

const { language } = translate;

exports.populateService = (service) => {
  if (!service || service.version) return null;

  const currentVersion = [...service.versions]
    .filter(version => moment(version.startDate).isSameOrBefore(new Date(), 'days'))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

  return { ...currentVersion, ...omit(service, 'versions') };
};

exports.populateSubscriptionsServices = (customer) => {
  if (!customer.subscriptions) return customer;

  return {
    ...customer,
    subscriptions: customer.subscriptions.map(sub => ({ ...sub, service: exports.populateService(sub.service) })),
  };
};

exports.subscriptionsAccepted = (customer) => {
  if (customer.subscriptions && customer.subscriptions.length > 0 && customer.subscriptions[0].versions) {
    if (customer.subscriptionsHistory && customer.subscriptionsHistory.length > 0) {
      const pickedVersionFields = ['unitTTCRate', 'weeklyHours', 'weeklyCount', 'evenings', 'saturdays', 'sundays'];
      const subscriptions = map(customer.subscriptions, (subscription) => {
        const lastVersion = [...subscription.versions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
        const version = pickBy(pick(lastVersion, pickedVersionFields));

        return { _id: subscription._id, service: get(subscription, 'service.name'), ...version };
      });

      const lastSubscriptionHistory = UtilsHelper.getLastVersion(customer.subscriptionsHistory, 'approvalDate');
      const lastSubscriptions = lastSubscriptionHistory.subscriptions
        .map(sub => ({ _id: sub.subscriptionId, ...pickBy(pick(sub, [...pickedVersionFields, 'service'])) }));

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
      .find(subscription => UtilsHelper.areObjectIdsEquals(subscription.service, payload.service));
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
  const customer = await Customer.findById(customerId).lean();
  const subscriptionsHistory = customer.subscriptionsHistory.filter((sh) => {
    const sub = sh.subscriptions.find(s => UtilsHelper.areObjectIdsEquals(s.subscriptionId, subscriptionId));
    return !(sh.subscriptions.length === 1 && sub);
  })
    .map(sh => ({
      ...sh,
      subscriptions: sh.subscriptions.filter(s => !UtilsHelper.areObjectIdsEquals(s.subscriptionId, subscriptionId)),
    }));

  await Customer.updateOne(
    { _id: customerId },
    { $pull: { subscriptions: { _id: subscriptionId } }, $set: { subscriptionsHistory } }
  );
};
