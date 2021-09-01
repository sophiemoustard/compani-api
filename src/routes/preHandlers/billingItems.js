const Boom = require('@hapi/boom');
const translate = require('../../helpers/translate');
const BillingItem = require('../../models/BillingItem');

const { language } = translate;

exports.authorizeBillingItemCreation = async (req) => {
  const billingItem = await BillingItem.countDocuments({
    name: req.payload.name,
    company: req.auth.credentials.company._id,
  });
  if (billingItem) throw Boom.conflict(translate[language].billingItemsConflict);

  return null;
};
