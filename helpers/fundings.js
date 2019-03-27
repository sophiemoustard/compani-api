const Boom = require('boom');
const moment = require('moment');

const Customer = require('../models/Customer');
const { getLastVersion } = require('./utils');
const { populateServices } = require('./subscriptions');

const checkSubscriptionFunding = async (customerId, checkedFunding) => {
  const customer = await Customer.findOne({ _id: customerId }).lean();
  if (!customer) return Boom.notFound('Error while checking subscription funding: customer not found.');

  if (!customer.fundings || customer.fundings.length === 0) return true;

  return customer.fundings
    .filter(fund => fund.subscriptions.some(sub => checkedFunding.subscriptions.includes(sub._id.toHexString())) &&
      checkedFunding._id !== fund._id.toHexString())
    .every((fund) => {
      const lastVersion = getLastVersion(fund.versions, 'createdAt');
      /** We allow two fundings to have the same subscription only if :
       * - the 2 fundings are not on the same period
       * - or the 2 fundings are on the same period but not the same days
       */
      return (!!lastVersion.endDate && moment(lastVersion.endDate).isBefore(checkedFunding.versions[0].startDate, 'day')) ||
        checkedFunding.versions[0].careDays.every(day => !lastVersion.careDays.includes(day));
    });
};

const populateFundings = async (funding, customer) => {
  if (!funding) return false;

  for (let i = 0, l = funding.subscriptions.length; i < l; i++) {
    const sub = customer.subscriptions.find(sub => sub._id.toHexString() === funding.subscriptions[i].toHexString());
    if (sub.service.versions) {
      funding.subscriptions[i] = { ...sub, service: await populateServices(sub.service) };
    } else {
      funding.subscriptions[i] = { ...sub }
    }
  }
  return funding;
};

module.exports = {
  checkSubscriptionFunding,
  populateFundings
};
