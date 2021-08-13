const Boom = require('@hapi/boom');
const Service = require('../../models/Service');
const Customer = require('../../models/Customer');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.authorizeServicesUpdate = async (req) => {
  try {
    const companyId = req.auth.credentials.company._id;
    const service = await Service.findOne({ _id: req.params._id, company: companyId, isArchived: false }).lean();

    if (!service) throw Boom.notFound(translate[language].serviceNotFound);
    return null;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizeServicesDeletion = async (req) => {
  try {
    const serviceId = req.params._id;
    const companyId = req.auth.credentials.company._id;
    const service = await Service.findOne({ _id: serviceId, company: companyId, isArchived: false }).lean();

    if (!service) throw Boom.notFound(translate[language].serviceNotFound);

    const subscriptionsCount = await Customer.countDocuments({ 'subscriptions.service': serviceId });
    if (subscriptionsCount) throw Boom.forbidden();

    return null;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};
