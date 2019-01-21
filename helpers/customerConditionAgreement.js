const _ = require('lodash');

const { populateServices } = require('./populateServices');

async function subscriptionsAccepted(customer) {
  if (customer.subscriptions && customer.subscriptions.length > 0) {
    customer.subscriptions = await populateServices(customer.subscriptions);
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

module.exports = { subscriptionsAccepted };
