const _ = require('lodash');
const moment = require('moment');

const Company = require('../models/Company');

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
      ..._.omit(version, ['thirdPartyPayer', 'subscriptions']),
      thirdPartyPayer: thirdPartyPayer.name,
      subscriptions: populateServices(services, version.subscriptions)
    };
  });

  funding.versions = populatedVersions;

  return funding;
};

module.exports = {
  populateFundings,
};
