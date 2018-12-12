const Company = require('../models/Company');

const populateServices = async (subscriptions) => {
  if (subscriptions.length === 0) return {};

  const company = await Company.findOne({ 'customersConfig.services._id': subscriptions[0].service });

  return subscriptions.map((subscription) => {
    const serviceId = subscription.service;
    const service = company.customersConfig.services.find(service => service._id.toHexString() == serviceId);

    return {
      ...subscription,
      service,
    };
  });
}

module.exports = {
  populateServices,
};