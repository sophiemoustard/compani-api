const _ = require('lodash');
const Company = require('../models/Company');

const populateThirdPartyPayers = async (funding) => {
  if (!funding) return false;

  const company = await Company.findOne({ 'customersConfig.thirdPartyPayers._id': funding.versions[0].thirdPartyPayer }).lean();

  const { thirdPartyPayers } = company.customersConfig;

  const populatedVersions = funding.versions.map((version) => {
    const thirdPartyPayer = thirdPartyPayers.find(tpp => tpp._id.toHexString() === version.thirdPartyPayer.toHexString());
    return {
      ..._.omit(version, ['thirdPartyPayer']),
      thirdPartyPayer: thirdPartyPayer.name
    };
  });

  funding.versions = populatedVersions;

  return funding;
};

module.exports = {
  populateThirdPartyPayers,
};
