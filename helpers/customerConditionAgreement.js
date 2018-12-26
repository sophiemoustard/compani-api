const _ = require('lodash');

const { populateServices } = require('./populateServices');

async function hasAgreedConditions(customer) {
  if (customer.subscriptions && customer.subscriptions.length > 0 && customer.subscriptionsHistory && customer.subscriptionsHistory.length > 0) {
    let subscriptions = await populateServices(customer.subscriptions);
    subscriptions = _.map(subscriptions, (subscription) => {
      const { service, _id, ...sub } = subscription;
      return {
        ...sub,
        service: service.name
      };
    });
    const lastSubscriptionHistory = customer.subscriptionsHistory.sort((a, b) => new Date(b.approvalDate) - new Date(a.approvalDate))[0];
    const lastSubscriptions = lastSubscriptionHistory.subscriptions.map(sub => _.omit(sub, ['_id']));
    customer.hasAgreedConditions = _.isEqual(subscriptions, lastSubscriptions);
  }
  return customer;
}

module.exports = { hasAgreedConditions };
