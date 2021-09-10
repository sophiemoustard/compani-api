const Boom = require('@hapi/boom');
const get = require('lodash/get');
const { PER_INTERVENTION } = require('../../helpers/constants');
const BillingItem = require('../../models/BillingItem');
const Customer = require('../../models/Customer');
const Service = require('../../models/Service');
const translate = require('../../helpers/translate');

const { language } = translate;

const authorizeServiceEdit = async (req) => {
  const serviceId = req.params._id;
  const companyId = req.auth.credentials.company._id;
  const service = await Service.findOne({ _id: serviceId, company: companyId }, { isArchived: 1 }).lean();
  if (!service) throw Boom.notFound(translate[language].serviceNotFound);
  if (service.isArchived) throw Boom.forbidden();

  if (get(req, 'payload.billingItems')) {
    const billingItemsCount = await BillingItem
      .countDocuments({ _id: { $in: req.payload.billingItems }, company: companyId, type: PER_INTERVENTION });
    if (billingItemsCount !== req.payload.billingItems.length) throw Boom.forbidden();
  }
};

exports.authorizeServicesUpdate = async (req) => {
  try {
    await authorizeServiceEdit(req);

    return null;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizeServicesDeletion = async (req) => {
  try {
    await authorizeServiceEdit(req);

    const subscriptionsCount = await Customer.countDocuments({ 'subscriptions.service': req.params._id });
    if (subscriptionsCount) throw Boom.forbidden();

    return null;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};
