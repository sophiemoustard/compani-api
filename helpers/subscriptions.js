const moment = require('moment');
const _ = require('lodash');
const Company = require('../models/Company');

const populateServices = async (customer) => {
  if (!customer.subscriptions || customer.subscriptions.length === 0) return customer;

  const company = await Company.findOne({ 'customersConfig.services._id': customer.subscriptions[0].service });

  return {
    ...customer,
    subscriptions: customer.subscriptions.map((subscription) => {
      const serviceId = subscription.service;
      const service = company.customersConfig.services.find(ser => ser._id.toHexString() == serviceId);
      const currentVersion = service.versions
        .filter(version => moment(version.startDate).isSameOrBefore(new Date(), 'days'))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

      return {
        ...subscription,
        service: {
          _id: service._id,
          name: currentVersion.name,
          nature: service.nature,
          defaultUnitAmount: currentVersion.defaultUnitAmount,
          vat: currentVersion.vat,
          holidaySurcharge: currentVersion.holidaySurcharge,
          eveningSurcharge: currentVersion.eveningSurcharge,
        },
      };
    }),
  };
};

async function subscriptionsAccepted(customer) {
  if (customer.subscriptions && customer.subscriptions.length > 0) {
    if (customer.subscriptionsHistory && customer.subscriptionsHistory.length > 0) {
      const subscriptions = _.map(customer.subscriptions, (subscription) => {
        const { service } = subscription;
        const lastVersion = subscription.versions.sort((a, b) => new Date(b.startDate) - new Date(a.startDate))[0];
        const { createdAt, _id, ...version } = lastVersion;

        return { service: service.name, ...version };
      });

      const lastSubscriptionHistory = customer.subscriptionsHistory.sort((a, b) => new Date(b.approvalDate) - new Date(a.approvalDate))[0];
      const lastSubscriptions = lastSubscriptionHistory.subscriptions.map(sub => _.omit(sub, ['_id']));
      customer.subscriptionsAccepted = _.isEqual(subscriptions, lastSubscriptions);
    } else {
      customer.subscriptionsAccepted = false;
    }
  }
  return customer;
}

module.exports = {
  populateServices,
  subscriptionsAccepted,
};
