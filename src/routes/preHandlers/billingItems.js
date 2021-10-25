const Boom = require('@hapi/boom');
const translate = require('../../helpers/translate');
const { areObjectIdsEquals } = require('../../helpers/utils');
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
    company: req.auth.credentials.company._id
  });
  if (!billingItem) throw Boom.notFound();

  const services = await Service.countDocuments({
    company: req.auth.credentials.company._id,
    'versions.billingItems': { $eq: req.params._id }
  });
  if (services) throw Boom.forbidden(translate[language].billingItemHasServiceLink);

  const bills = await Bill.countDocuments({
    company: req.auth.credentials.company._id,
    'billingItemList.billingItem': { $eq: req.params._id }
  });
  if (bills) throw Boom.forbidden(translate[language].billingItemHasBillLink);
 
  return null;
};
