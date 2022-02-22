const Boom = require('@hapi/boom');
const get = require('lodash/get');
const translate = require('../../helpers/translate');
const UtilsHelper = require('../../helpers/utils');
const DatesHelper = require('../../helpers/dates');
const { INTERVENTION, NOT_INVOICED_AND_NOT_PAID, HOURLY, FIXED } = require('../../helpers/constants');
const Customer = require('../../models/Customer');
const UserCompany = require('../../models/UserCompany');
const Event = require('../../models/Event');
const Repetition = require('../../models/Repetition');
const Sector = require('../../models/Sector');
const Service = require('../../models/Service');
const ThirdPartyPayer = require('../../models/ThirdPartyPayer');
const Bill = require('../../models/Bill');
const Payment = require('../../models/Payment');
const CreditNote = require('../../models/CreditNote');
const TaxCertificate = require('../../models/TaxCertificate');

const { language } = translate;

exports.validateCustomerCompany = async (params, payload, companyId) => {
  let query = { _id: params._id };
  if (params.subscriptionId) query = { ...query, 'subscriptions._id': params.subscriptionId };
  else if (params.mandateId) query = { ...query, 'payment.mandates._id': params.mandateId };
  else if (params.quoteId) query = { ...query, 'quotes._id': params.quoteId };
  else if (params.fundingId) {
    query = { ...query, 'fundings._id': params.fundingId };
    if (payload && payload.subscription) query = { ...query, 'subscriptions._id': payload.subscription };
  }

  const customer = await Customer.findOne(query).lean();
  if (!customer) throw Boom.notFound(translate[language].customerNotFound);

  if (!UtilsHelper.areObjectIdsEquals(customer.company, companyId)) throw Boom.forbidden();
};

exports.authorizeCustomerUpdate = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  await exports.validateCustomerCompany(req.params, req.payload, companyId);
  const { payload } = req;

  if (payload) {
    if (payload.referent) {
      const referent = await UserCompany.countDocuments({ user: payload.referent, company: companyId });
      if (!referent) return Boom.forbidden();
    }

    if (payload.thirdPartyPayer) {
      const thirdPartyPayer = await ThirdPartyPayer
        .findOne({ _id: payload.thirdPartyPayer, company: companyId })
        .select('teletransmissionId')
        .lean();
      if (!thirdPartyPayer) return Boom.forbidden();

      const fundingLastVersion = UtilsHelper.getLastVersion(payload.versions, 'createdAt');
      if (thirdPartyPayer.teletransmissionId && !fundingLastVersion.fundingPlanId) return Boom.badRequest();
      if (!thirdPartyPayer.teletransmissionId && fundingLastVersion.fundingPlanId) return Boom.forbidden();
    }

    if (req.params.fundingId) {
      const { _id, fundingId } = req.params;
      const customer = await Customer.findOne({ _id, 'fundings._id': fundingId })
        .populate('fundings.thirdPartyPayer')
        .select('fundings')
        .lean();
      const hasTeletransmissionId = customer.fundings.find(funding =>
        UtilsHelper.areObjectIdsEquals(funding._id, fundingId) && funding.thirdPartyPayer.teletransmissionId);
      if (payload.fundingPlanId && !hasTeletransmissionId) return Boom.forbidden();
      if (!payload.fundingPlanId && hasTeletransmissionId) return Boom.badRequest();
    }

    if (payload.stoppedAt) {
      const customer = await Customer.countDocuments(
        { _id: req.params._id, $or: [{ stoppedAt: { $exists: true } }, { createdAt: { $gt: payload.stoppedAt } }] }
      );
      if (customer) return Boom.forbidden();
    }

    if (payload.archivedAt) {
      const customer = await Customer.countDocuments({
        _id: req.params._id,
        $or: [{ stoppedAt: { $exists: false } }, { archivedAt: { $exists: true } }],
      });
      if (customer) throw Boom.forbidden();

      const stoppedCustomer = await Customer
        .findOne({ _id: req.params._id, stoppedAt: { $exists: true } }, { stoppedAt: 1 })
        .lean();

      if (DatesHelper.isBefore(payload.archivedAt, stoppedCustomer.stoppedAt)) {
        throw Boom.forbidden(translate[language].archivingNotAllowedBeforeStoppingDate);
      }

      const eventsToBill = await Event.countDocuments({
        customer: req.params._id,
        isBilled: false,
        $or: [{ isCancelled: false }, { 'cancel.condition': { $ne: NOT_INVOICED_AND_NOT_PAID } }],
      });
      if (eventsToBill) throw Boom.forbidden(translate[language].archivingNotAllowed);
    }
  }

  return null;
};

exports.authorizeSubscriptionCreation = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);

  const service = await Service.findOne({
    _id: req.payload.service,
    company: companyId,
    $or: [{ isArchived: { $exists: false } }, { isArchived: false }],
  }).lean();
  if (!service) throw Boom.forbidden();

  if (service.nature === HOURLY && req.payload.versions.some(v => !v.weeklyHours)) throw Boom.badData();
  if (service.nature === FIXED && req.payload.versions.some(v => !v.weeklyCount || v.weeklyHours)) throw Boom.badData();

  return exports.authorizeCustomerUpdate(req);
};

exports.authorizeSubscriptionUpdate = async (req) => {
  const { subscriptionId } = req.params;
  const customer = await Customer.findOne({ _id: req.params._id, 'subscriptions._id': subscriptionId })
    .populate('subscriptions.service')
    .lean();
  if (!customer) throw Boom.notFound();

  const subscription = customer.subscriptions.find(sub => UtilsHelper.areObjectIdsEquals(sub._id, subscriptionId));
  if (subscription.service.isArchived) throw Boom.forbidden();

  const { payload } = req;
  if (subscription.service.nature === HOURLY && !payload.weeklyHours) throw Boom.badData();
  if (subscription.service.nature === FIXED && (!payload.weeklyCount || payload.weeklyHours)) throw Boom.badData();

  return exports.authorizeCustomerUpdate(req);
};

exports.authorizeSubscriptionDeletion = async (req) => {
  const { subscriptionId, _id: customerId } = req.params;

  const eventsLinkedToSub = await Event.countDocuments({ subscription: subscriptionId });
  const repetitionsLinkedToSub = await Repetition.countDocuments({ subscription: subscriptionId });
  const fundingsLinkedToSub = await Customer
    .countDocuments({ _id: customerId, 'fundings.subscription': subscriptionId });

  if (eventsLinkedToSub || repetitionsLinkedToSub || fundingsLinkedToSub) {
    throw Boom.forbidden(translate[language].customerSubscriptionDeletionForbidden);
  }

  return exports.authorizeCustomerUpdate(req);
};

exports.authorizeCustomerGet = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  if (req.params) await exports.validateCustomerCompany(req.params, req.payload, companyId);

  return null;
};

exports.authorizeCustomerGetBySector = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);

  if (req.query && req.query.sector) {
    const sectors = UtilsHelper.formatIdsArray(req.query.sector);
    const sectorsCount = await Sector.countDocuments({ _id: { $in: sectors }, company: companyId });
    if (sectors.length !== sectorsCount) throw Boom.forbidden();
  }

  return null;
};

exports.authorizeCustomerDelete = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  const customerId = get(req, 'params._id', null);

  const customer = await Customer.countDocuments({ _id: customerId, company: companyId });
  if (!customer) throw Boom.notFound(translate[language].customerNotFound);

  const interventionsCount = await Event.countDocuments({ customer: customerId, type: INTERVENTION });
  if (interventionsCount) throw Boom.forbidden();

  const billsCount = await Bill.countDocuments({ customer: customerId, company: companyId });
  if (billsCount) throw Boom.forbidden();

  const paymentsCount = await Payment.countDocuments({ customer: customerId, company: companyId });
  if (paymentsCount) throw Boom.forbidden();

  const creditNotesCount = await CreditNote.countDocuments({ customer: customerId, company: companyId });
  if (creditNotesCount) throw Boom.forbidden();

  const taxCertificatesCount = await TaxCertificate.countDocuments({ customer: customerId, company: companyId });
  if (taxCertificatesCount) throw Boom.forbidden();

  return null;
};
