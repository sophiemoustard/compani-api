const Boom = require('boom');
const moment = require('moment');

const Customer = require('../models/Customer');
const Company = require('../models/Company');
const { getLastVersion } = require('./utils');
const { populateServices } = require('./subscriptions');

const checkSubscriptionFunding = async (customerId, payloadVersion) => {
  const customer = await Customer.findById(customerId).lean();
  if (!customer) return Boom.notFound('Error while checking subscription funding: customer not found.');

  if (!customer.fundings || customer.fundings.length === 0) return true;
  const lastVersions = customer.fundings.map(funding => getLastVersion(funding.versions, 'createdAt'));

  return lastVersions
    .filter(version => version.services.some(sub => payloadVersion.services.includes(sub.toHexString())))
    .every(el => (el.endDate ? moment(el.endDate).isBefore(payloadVersion.startDate, 'day') : false));
};

const populateFundings = async (funding) => {
  if (!funding) return false;

  const company = await Company.findOne({ 'customersConfig.thirdPartyPayers._id': funding.versions[0].thirdPartyPayer }).lean();
  const { thirdPartyPayers, services: companyServices } = company.customersConfig;


  const populatedVersions = funding.versions.map(async (version) => {
    const thirdPartyPayer = thirdPartyPayers.find(tpp => tpp._id.toHexString() === version.thirdPartyPayer.toHexString());

    const fundingServices = [];
    for (const serviceId of version.services) {
      fundingServices.push(await populateServices(serviceId, companyServices));
    }

    return {
      ...version,
      thirdPartyPayer: thirdPartyPayer.name,
      services: [...fundingServices],
    };
  });

  funding.versions = await Promise.all(populatedVersions);

  return funding;
};

module.exports = {
  checkSubscriptionFunding,
  populateFundings
};
