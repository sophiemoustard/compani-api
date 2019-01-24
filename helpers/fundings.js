const Boom = require('boom');
const moment = require('moment');

const Customer = require('../models/Customer');
const Company = require('../models/Company');
const { getLastVersion } = require('./utils');

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

const populateServices = (services, subscriptions) => {
  if (!subscriptions || subscriptions.length === 0) return [];

  return subscriptions.map((subscription) => {
    const serviceId = subscription;
    const service = services.find(ser => ser._id.toHexString() == serviceId);
    const currentVersion = service.versions
      .filter(version => moment(version.startDate).isSameOrBefore(new Date(), 'days'))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    return {
      ...currentVersion,
      _id: service._id
    };
  });
};

const populateFundings = async (funding) => {
  if (!funding) return false;

  const company = await Company.findOne({ 'customersConfig.thirdPartyPayers._id': funding.versions[0].thirdPartyPayer }).lean();

  const { thirdPartyPayers, services } = company.customersConfig;

  const populatedVersions = funding.versions.map((version) => {
    const thirdPartyPayer = thirdPartyPayers.find(tpp => tpp._id.toHexString() === version.thirdPartyPayer.toHexString());
    return {
      thirdPartyPayer: thirdPartyPayer.name,
      subscriptions: populateServices(services, version.subscriptions)
    };
  });

  funding.versions = populatedVersions;

  return funding;
};

module.exports = {
  checkSubscriptionFunding,
  populateFundings
};
