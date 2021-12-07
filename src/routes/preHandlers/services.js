const Boom = require('@hapi/boom');
const get = require('lodash/get');
const { PER_INTERVENTION } = require('../../helpers/constants');
const DatesHelper = require('../../helpers/dates');
const UtilsHelper = require('../../helpers/utils');
const BillingItem = require('../../models/BillingItem');
const Customer = require('../../models/Customer');
const Service = require('../../models/Service');
const translate = require('../../helpers/translate');

const { language } = translate;

const checkBillingItemsExist = async (billingItems, companyId) => {
  const billingItemsCount = await BillingItem.countDocuments(
    { _id: { $in: billingItems }, company: companyId, type: PER_INTERVENTION }
  );
  if (billingItemsCount !== billingItems.length) throw Boom.forbidden();
};

exports.authorizeServiceCreation = async (req) => {
  const { auth, payload } = req;
  const companyId = get(auth, 'credentials.company._id', null);

  for (const version of payload.versions) {
    if (get(version, 'billingItems')) await checkBillingItemsExist(version.billingItems, companyId);
  }

  return null;
};

const authorizeServiceEdit = async (req) => {
  const serviceId = req.params._id;
  const { auth, payload } = req;
  const companyId = get(auth, 'credentials.company._id', null);

  const service = await Service.findOne({ _id: serviceId, company: companyId }, { isArchived: 1, versions: 1 }).lean();
  if (!service) throw Boom.notFound(translate[language].serviceNotFound);
  if (service.isArchived) throw Boom.forbidden();

  if (get(payload, 'billingItems')) await checkBillingItemsExist(payload.billingItems, companyId);

  if (get(payload, 'startDate')) {
    const lastVersion = UtilsHelper.getLastVersion(service.versions, 'startDate');
    if (DatesHelper.isSameOrBefore(payload.startDate, lastVersion.startDate)) throw Boom.forbidden();
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
