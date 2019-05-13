const Boom = require('boom');

const Customer = require('../models/Customer');
const { populateServices } = require('./subscriptions');

const checkSubscriptionFunding = async (customerId, checkedFunding) => {
  const customer = await Customer.findOne({ _id: customerId }).lean();
  if (!customer) return Boom.notFound('Error while checking subscription funding: customer not found.');

  if (!customer.fundings || customer.fundings.length === 0) return true;

  return customer.fundings
    .filter(fund => checkedFunding.subscription === fund.subscription.toHexString() &&
      checkedFunding._id !== fund._id.toHexString())
  /** We allow two fundings to have the same subscription only if :
  * - the 2 fundings are on the same period but not the same days
  */
    .every(fund => checkedFunding.careDays.every(day => !fund.careDays.includes(day)));
};

const populateFundings = async (funding, customer) => {
  if (!funding) return false;

  const sub = customer.subscriptions.find(sb => sb._id.toHexString() === funding.subscription.toHexString());
  if (sub.service.versions) {
    funding.subscription = { ...sub, service: await populateServices(sub.service) };
  } else {
    funding.subscription = { ...sub };
  }

  return funding;
};

module.exports = {
  checkSubscriptionFunding,
  populateFundings
};
