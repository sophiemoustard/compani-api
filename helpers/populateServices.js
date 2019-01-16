const Company = require('../models/Company');

const populateServices = async (subscriptions) => {
  if (!subscriptions || subscriptions.length === 0) return [];

  const company = await Company.findOne({ 'customersConfig.services._id': subscriptions[0].service });

  return subscriptions.map((subscription) => {
    const serviceId = subscription.service;
    const service = company.customersConfig.services.find(ser => ser._id.toHexString() == serviceId);
    const lastVersion = service.versions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

    return {
      ...subscription,
      service: {
        _id: service._id,
        name: lastVersion.name,
        nature: service.nature,
      },
    };
  });
};

module.exports = {
  populateServices,
};
