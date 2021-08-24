const Boom = require('@hapi/boom');
const Service = require('../../models/Service');
const Customer = require('../../models/Customer');
const translate = require('../../helpers/translate');

const { language } = translate;

const authorizeServiceEdit = async (req) => {
  const serviceId = req.params._id;
  const companyId = req.auth.credentials.company._id;
  const service = await Service.findOne({ _id: serviceId, company: companyId, isArchived: false }).lean();

  if (!service) throw Boom.notFound(translate[language].serviceNotFound);
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
