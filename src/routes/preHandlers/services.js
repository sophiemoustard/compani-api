const Boom = require('@hapi/boom');
const { PER_INTERVENTION } = require('../../helpers/constants');
const BillingItem = require('../../models/BillingItem');
const Customer = require('../../models/Customer');
const Service = require('../../models/Service');

const authorizeServiceEdit = async (req) => {
  const serviceId = req.params._id;
  const companyId = req.auth.credentials.company._id;
  const service = await Service.findOne({ _id: serviceId, company: companyId, isArchived: false }).lean();
  if (!service) throw Boom.forbidden();

  if (req.payload && req.payload.billingItems) {
    const billingItems = await BillingItem
      .find({ _id: { $in: req.payload.billingItems }, company: companyId, type: PER_INTERVENTION })
      .lean();
    if (!billingItems) throw Boom.forbidden();
    if (billingItems.length !== req.payload.billingItems.length) throw Boom.forbidden();
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
