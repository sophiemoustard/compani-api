const moment = require('moment');
const _ = require('lodash');
const Surcharge = require('../models/Surcharge');

const populateServices = async (service) => {
  const currentVersion = service.versions
    .filter(version => moment(version.startDate).isSameOrBefore(new Date(), 'days'))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  currentVersion.surcharge = await Surcharge.findOne({ _id: currentVersion.surcharge });
  return {
    _id: service._id,
    name: currentVersion.name,
    nature: service.nature,
    type: service.type,
    defaultUnitAmount: currentVersion.defaultUnitAmount,
    vat: currentVersion.vat,
    surcharge: currentVersion.surcharge,
  };
};

const populateSubscriptionsServices = async (customer) => {
  if (!customer.subscriptions || customer.subscriptions.length === 0) return customer;
  const subscriptions = [];
  for (let i = 0, l = customer.subscriptions.length; i < l; i++) {
    subscriptions.push({
      ...customer.subscriptions[i],
      service: await populateServices(customer.subscriptions[i].service)
    });
  }
  return { ...customer, subscriptions };
};

const subscriptionsAccepted = (customer) => {
  if (customer.subscriptions && customer.subscriptions.length > 0) {
    if (customer.subscriptionsHistory && customer.subscriptionsHistory.length > 0) {
      const subscriptions = _.map(customer.subscriptions, (subscription) => {
        const { service } = subscription;
        const lastVersion = subscription.versions.sort((a, b) => new Date(b.startDate) - new Date(a.startDate))[0];
        const { createdAt, _id, ...version } = lastVersion;
        delete version.startDate;

        return _.pickBy({ service: service.name, ...version });
      });

      const lastSubscriptionHistory = customer.subscriptionsHistory.sort((a, b) => new Date(b.approvalDate) - new Date(a.approvalDate))[0];
      const lastSubscriptions = lastSubscriptionHistory.subscriptions.map(sub => _.pickBy(_.omit(sub, ['_id', 'startDate'])));
      customer.subscriptionsAccepted = _.isEqual(subscriptions, lastSubscriptions);
    } else {
      customer.subscriptionsAccepted = false;
    }
  }
  return customer;
};

module.exports = {
  populateServices,
  populateSubscriptionsServices,
  subscriptionsAccepted,
};
