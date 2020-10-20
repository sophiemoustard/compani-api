const Boom = require('@hapi/boom');
const Service = require('../../models/Service');
const Customer = require('../../models/Customer');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.authorizeServiceEdit = async (service, credentials) => {
  if (!credentials.company || !credentials.company._id) throw Boom.forbidden();
  const companyId = credentials.company._id;

  if (service.isArchived) throw Boom.forbidden();
  if (service.company.toHexString() !== companyId.toHexString()) throw Boom.forbidden();
  return null;
};

exports.authorizeServicesUpdate = async (req) => {
  try {
    const service = await Service.findOne({ _id: req.params._id }).lean();

    if (!service) throw Boom.notFound(translate[language].serviceNotFound);
    return exports.authorizeServiceEdit(service, req.auth.credentials);
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizeServicesDeletion = async (req) => {
  try {
    const serviceId = req.params._id;
    const service = await Service.findOne({ _id: serviceId }).lean();

    if (!service) throw Boom.notFound(translate[language].serviceNotFound);
    await exports.authorizeServiceEdit(service, req.auth.credentials);

    const subscriptionsCount = await Customer.countDocuments({ 'subscriptions.service': serviceId });
    if (subscriptionsCount) throw Boom.forbidden();

    return null;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};
