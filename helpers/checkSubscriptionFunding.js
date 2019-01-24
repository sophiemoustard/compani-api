const Boom = require('boom');
const moment = require('moment');

const Customer = require('../models/Customer');
const {
  getLastVersion
} = require('./getLastVersion');

const checkSubscriptionFunding = async (customerId, payloadVersion) => {
  const customer = await Customer.findById(customerId).lean();
  if (!customer) return Boom.notFound('Error while checking subscription funding: customer not found.');

  if (!customer.fundings || customer.fundings.length === 0) return true;
  const lastVersions = customer.fundings.map(funding => getLastVersion(funding.versions, 'createdAt'));

  return lastVersions
    .filter(version => version.subscriptions.some(sub => payloadVersion.subscriptions.includes(sub.toHexString())))
    .every((el) => {
      return el.endDate ? moment(el.endDate).isBefore(payloadVersion.startDate, 'day') : false;
    });
};

module.exports = {
  checkSubscriptionFunding
};
