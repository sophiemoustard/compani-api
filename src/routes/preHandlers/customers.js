const Boom = require('@hapi/boom');
const get = require('lodash/get');
const translate = require('../../helpers/translate');
const UtilsHelper = require('../../helpers/utils');
const Customer = require('../../models/Customer');
const User = require('../../models/User');
const Event = require('../../models/Event');
const Sector = require('../../models/Sector');
const Service = require('../../models/Service');
const ThirdPartyPayer = require('../../models/ThirdPartyPayer');
const Bill = require('../../models/Bill');
const Payment = require('../../models/Payment');
const CreditNote = require('../../models/CreditNote');
const TaxCertificate = require('../../models/TaxCertificate');

const { language } = translate;

exports.getCustomer = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  const customer = await Customer
    .findById(req.params._id)
    // need the match as it is a virtual populate
    .populate({ path: 'firstIntervention', select: 'startDate', match: { company: companyId } });
  if (!customer) throw Boom.notFound(translate[language].customerNotFound);

  if (customer.company.toHexString() !== companyId.toHexString()) throw Boom.forbidden();

  return customer;
};

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

  if (customer.company.toHexString() !== companyId.toHexString()) throw Boom.forbidden();
};

exports.checkAuthorization = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  await exports.validateCustomerCompany(req.params, req.payload, companyId);

  if (req.payload) {
    if (req.payload.referent) {
      const referent = await User.countDocuments({ _id: req.payload.referent, company: companyId });
      if (!referent) return Boom.forbidden();
    }

    if (req.payload.thirdPartypayer) {
      const thirdPartypayer = await ThirdPartyPayer
        .findOne({ _id: req.payload.thirdPartypayer, company: companyId })
        .lean();
      if (!thirdPartypayer) return Boom.forbidden();
    }
  }

  return null;
};

exports.authorizeCustomerUpdate = async req => exports.checkAuthorization(req);

exports.authorizeSubscriptionCreation = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);

  const service = await Service.findOne({ _id: req.payload.service, company: companyId }).lean();
  if (!service) throw Boom.forbidden();
  if (service.isArchived) throw Boom.forbidden();

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
  return exports.authorizeCustomerUpdate(req);
};

exports.authorizeSubscriptionDeletion = async (req) => {
  const eventsCount = await Event.countDocuments({ subscription: req.params.subscriptionId });
  if (eventsCount > 0) throw Boom.forbidden(translate[language].customerSubscriptionDeletionForbidden);
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
  const { customer } = req.pre;
  const companyId = get(req, 'auth.credentials.company._id', null);

  if (customer.firstIntervention) throw Boom.forbidden();

  const billsCount = await Bill.countDocuments({ customer: customer._id, company: companyId }).lean();
  if (billsCount > 0) throw Boom.forbidden();

  const paymentsCount = await Payment.countDocuments({ customer: customer._id, company: companyId }).lean();
  if (paymentsCount > 0) throw Boom.forbidden();

  const creditNotesCount = await CreditNote.countDocuments({ customer: customer._id, company: companyId }).lean();
  if (creditNotesCount > 0) throw Boom.forbidden();

  const taxCertificatesCount = await TaxCertificate
    .countDocuments({ customer: customer._id, company: companyId })
    .lean();
  if (taxCertificatesCount > 0) throw Boom.forbidden();

  return null;
};
