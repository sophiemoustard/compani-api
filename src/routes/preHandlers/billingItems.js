const Boom = require('@hapi/boom');
const translate = require('../../helpers/translate');
const BillingItem = require('../../models/BillingItem');
const Service = require('../../models/Service');
const Bill = require('../../models/Bill');

const { language } = translate;

exports.authorizeBillingItemCreation = async (req) => {
  const billingItem = await BillingItem.countDocuments({
    name: req.payload.name,
    company: req.auth.credentials.company._id,
  });
  if (billingItem) throw Boom.conflict(translate[language].billingItemsConflict);

  return null;
};
exports.authorizeBillingItemDeletion = async (req) => {
  const billingItem = await BillingItem.countDocuments({
    _id: req.params._id,
    company: req.auth.credentials.company._id,
  });
  if (!billingItem) throw Boom.notFound();

  const services = await Service.countDocuments({
    company: req.auth.credentials.company._id,
    'versions.billingItems': req.params._id,
  });
  if (services) throw Boom.forbidden(translate[language].billingItemHasServiceLinked);

  const bills = await Bill.countDocuments({
    company: req.auth.credentials.company._id,
    'billingItemList.billingItem': req.params._id,
  });
  if (bills) throw Boom.forbidden(translate[language].billingItemHasBillLinked);

  return null;
};
