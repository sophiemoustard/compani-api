const moment = require('moment');
const Company = require('../models/Company');

const populateServices = async (subscriptions) => {
  if (!subscriptions || subscriptions.length === 0) return [];

  const company = await Company.findOne({ 'customersConfig.services._id': subscriptions[0].service });

  return subscriptions.map((subscription) => {
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
  });
};

module.exports = {
  populateServices,
};
