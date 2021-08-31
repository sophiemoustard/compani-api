const Boom = require('@hapi/boom');
const BillingItem = require('../../models/BillingItem');

exports.authorizeBillingItemCreation = async (req) => {
  const billingItem = await BillingItem.countDocuments({
    name: req.payload.name,
    company: req.auth.credentials.company._id,
  });
  if (billingItem) throw Boom.forbidden();

  return null;
};
