const moment = require('moment');
const pickBy = require('lodash/pickBy');
const get = require('lodash/get');
const pick = require('lodash/pick');
const map = require('lodash/map');
const isEqual = require('lodash/isEqual');
const Customer = require('../models/Customer');
const UtilsHelper = require('../helpers/utils');
const { CIVILITY_LIST } = require('./constants');

exports.populateServices = (service) => {
  if (!service || service.version) return;

  const currentVersion = [...service.versions]
    .filter(version => moment(version.startDate).isSameOrBefore(new Date(), 'days'))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

  return {
    ...currentVersion,
    _id: service._id,
    nature: service.nature,
    type: service.type,
  };
};

exports.populateSubscriptionsServices = (customer) => {
  if (!customer.subscriptions || customer.subscriptions.length === 0) return customer;
  const subscriptions = [];
  for (let i = 0, l = customer.subscriptions.length; i < l; i++) {
    subscriptions.push({
      ...customer.subscriptions[i],
      service: exports.populateServices(customer.subscriptions[i].service),
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

      const lastSubscriptionHistory = [...customer.subscriptionsHistory].sort((a, b) => new Date(b.approvalDate) - new Date(a.approvalDate))[0];
      const lastSubscriptions = lastSubscriptionHistory.subscriptions
        .map(sub => pick(sub, ['unitTTCRate', 'estimatedWeeklyVolume', 'evenings', 'sundays', 'service']));
      customer.subscriptionsAccepted = isEqual(subscriptions, lastSubscriptions);
    } else {
      customer.subscriptionsAccepted = false;
    }
  }
  return customer;
};

const subscriptionExportHeader = [
  'Titre',
  'Nom',
  'Prénom',
  'Service',
  'Prix unitaire TTC',
  'Volume hebdomadaire estimatif',
  'Dont soirées',
  'Dont dimanches',
];

exports.exportSubscriptions = async (credentials) => {
  const customers = await Customer
    .find({ subscriptions: { $exists: true, $not: { $size: 0 } }, company: get(credentials, 'company._id', null) })
    .populate({ path: 'subscriptions.service' })
    .lean();
  const data = [subscriptionExportHeader];

  for (const cus of customers) {
    for (const sub of cus.subscriptions) {
      const subInfo = [];
      if (cus.identity) {
        subInfo.push(
          CIVILITY_LIST[get(cus, 'identity.title')] || '',
          get(cus, 'identity.lastname', '').toUpperCase(),
          get(cus, 'identity.firstname', '')
        );
      } else subInfo.push('', '', '');

      const lastServiceVersion = UtilsHelper.getLastVersion(sub.service.versions, 'startDate');
      if (lastServiceVersion) subInfo.push(lastServiceVersion.name);
      else subInfo.push('');

      const lastVersion = UtilsHelper.getLastVersion(sub.versions, 'createdAt');
      if (lastVersion) {
        subInfo.push(
          UtilsHelper.formatFloatForExport(lastVersion.unitTTCRate),
          UtilsHelper.formatFloatForExport(lastVersion.estimatedWeeklyVolume),
          lastVersion.evenings || '',
          lastVersion.sundays || ''
        );
      } else subInfo.push('', '', '', '');

      data.push(subInfo);
    }
  }

  return data;
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
