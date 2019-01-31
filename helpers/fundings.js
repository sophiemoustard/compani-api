const Boom = require('boom');
const moment = require('moment');

const Customer = require('../models/Customer');
const Company = require('../models/Company');
const { getLastVersion } = require('./utils');
const { populateServices } = require('./subscriptions');

const checkSubscriptionFunding = async (customerId, checkedFunding) => {
  const customer = await Customer.findById(customerId).lean();
  if (!customer) return Boom.notFound('Error while checking subscription funding: customer not found.');

  if (!customer.fundings || customer.fundings.length === 0) return true;

  return customer.fundings
    .filter(fund => fund.services.some(ser => checkedFunding.services.includes(ser._id.toHexString())))
    .every((fund) => {
      const lastVersion = getLastVersion(fund.versions, 'createdAt');
      return lastVersion.endDate ? moment(lastVersion.endDate).isBefore(checkedFunding.versions[0].startDate, 'day') : false;
    });
};

const populateFundings = async (funding) => {
  if (!funding) return false;

  const company = await Company.findOne({ 'customersConfig.thirdPartyPayers._id': funding.thirdPartyPayer }).lean();
  const { thirdPartyPayers, services: companyServices } = company.customersConfig;

  const thirdPartyPayer = thirdPartyPayers.find(tpp => tpp._id.toHexString() === funding.thirdPartyPayer.toHexString());
  funding.thirdPartyPayer = { _id: thirdPartyPayer._id, name: thirdPartyPayer.name };

  const fundingServices = [];
  for (const serviceId of funding.services) fundingServices.push(await populateServices(serviceId, companyServices));
  funding.services = await Promise.all(fundingServices);

  return funding;
};

module.exports = {
  checkSubscriptionFunding,
  populateFundings
};
