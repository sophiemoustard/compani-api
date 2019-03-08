const moment = require('moment');
const _ = require('lodash');

const populateServices = (service) => {
  const currentVersion = service.versions
    .filter(version => moment(version.startDate).isSameOrBefore(new Date(), 'days'))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

  return {
    _id: service._id,
    name: currentVersion.name,
    nature: service.nature,
    type: service.type,
    defaultUnitAmount: currentVersion.defaultUnitAmount,
    vat: currentVersion.vat,
    holidaySurcharge: currentVersion.holidaySurcharge,
    eveningSurcharge: currentVersion.eveningSurcharge,
  };
};

const populateSubscriptionsServices = (customer) => {
  if (!customer.subscriptions || customer.subscriptions.length === 0) return customer;

  const subscriptions = [];
  for (const subscription of customer.subscriptions) {
    subscriptions.push({
      ...subscription,
      service: populateServices(subscription.service)
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
