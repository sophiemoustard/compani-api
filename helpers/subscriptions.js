const moment = require('moment');
const _ = require('lodash');
const Company = require('../models/Company');

const populateServices = async (serviceId, services) => {
  const service = services.find(ser => ser._id.toHexString() == serviceId);
  const currentVersion = service.versions
    .filter(version => moment(version.startDate).isSameOrBefore(new Date(), 'days'))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

  return {
    _id: service._id,
    name: currentVersion.name,
    nature: service.nature,
    defaultUnitAmount: currentVersion.defaultUnitAmount,
    vat: currentVersion.vat,
    holidaySurcharge: currentVersion.holidaySurcharge,
    eveningSurcharge: currentVersion.eveningSurcharge,
  };
};

const populateSubscriptionsSerivces = async (customer) => {
  if (!customer.subscriptions || customer.subscriptions.length === 0) return customer;

  const company = await Company.findOne({ 'customersConfig.services._id': customer.subscriptions[0].service });
  const { services } = company.customersConfig;

  const subscriptions = [];
  for (const subscription of customer.subscriptions) {
    subscriptions.push({
      ...subscription,
      service: await populateServices(subscription.service, services),
    });
  }

  return { ...customer, subscriptions };
};

async function subscriptionsAccepted(customer) {
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
      const lastSubscriptions = lastSubscriptionHistory.subscriptions.map(sub => _.pickBy(_.omit(sub, ['_id'])));
      customer.subscriptionsAccepted = _.isEqual(subscriptions, lastSubscriptions);
    } else {
      customer.subscriptionsAccepted = false;
    }
  }
  return customer;
}

module.exports = {
  populateServices,
  populateSubscriptionsSerivces,
  subscriptionsAccepted,
};
