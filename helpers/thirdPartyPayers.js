const Customer = require('../models/Customer');

const isUsedInFundings = async (thirdPartyPayers) => {
  if (!thirdPartyPayers || !Array.isArray(thirdPartyPayers)) return false;
  for (const tpp of thirdPartyPayers) {
    const customers = await Customer.find({ fundings: { $exists: true }, 'fundings.thirdPartyPayer': tpp._id });
    tpp.isUsedInFundings = customers.length > 0;
  }
  return thirdPartyPayers;
};

module.exports = { isUsedInFundings };
