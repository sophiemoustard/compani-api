const Boom = require('boom');
const get = require('lodash/get');
const translate = require('../../helpers/translate');
const Customer = require('../../models/Customer');
const User = require('../../models/User');
const Sector = require('../../models/Sector');
const Service = require('../../models/Service');
const ThirdPartyPayer = require('../../models/ThirdPartyPayer');

const { language } = translate;

exports.getCustomer = async (req) => {
  try {
    const companyId = get(req, 'auth.credentials.company._id', null);
    const customer = await Customer
      .findById(req.params._id)
      // need the match as it is a virtual populate
      .populate({ path: 'firstIntervention', select: 'startDate', match: { company: companyId } });
    if (!customer) throw Boom.notFound(translate[language].customerNotFound);

    if (customer.company.toHexString() !== companyId.toHexString()) throw Boom.forbidden();

    return customer;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.validateCustomerCompany = async (params, payload, companyId) => {
  const query = { _id: params._id };
  if (params.subscriptionId) query.subscriptions._id = params.subscriptionId;
  else if (params.mandateId) query.payment.mandates._id = params.mandateId;
  else if (params.quoteId) query.quotes._id = params.quoteId;
  else if (params.fundingId) {
    query.fundings._id = params.fundingId;
    if (payload && payload.subscription) query.subscriptions._id = query.subscription;
  }

  const customer = await Customer.findOne(query).lean();
  if (!customer) throw Boom.notFound(translate[language].customerSubscriptionsNotFound);

  if (customer.company.toHexString() !== companyId.toHexString()) throw Boom.forbidden();
};

exports.authorizeCustomerUpdate = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  await exports.validateCustomerCompany(req.params, req.payload, companyId);

  if (req.payload) {
    if (req.payload.referent) {
      const referent = await User.findOne({ _id: req.payload.referent, company: companyId }).lean();
      if (!referent) throw Boom.forbidden();
    }

    if (req.payload.service) {
      const service = await Service.findOne({ _id: req.payload.service, company: companyId }).lean();
      if (!service) throw Boom.forbidden();
    }

    if (req.payload.thirdPartypayer) {
      const thirdPartypayer = await ThirdPartyPayer
        .findOne({ _id: req.payload.thirdPartypayer, company: companyId })
        .lean();
      if (!thirdPartypayer) throw Boom.forbidden();
    }
  }

  return null;
};

exports.authorizeCustomerGet = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);

  if (req.params) await exports.validateCustomerCompany(req.params, req.payload, companyId);

  if (req.query && req.query.sector) {
    const sectors = Array.isArray(req.query.sector) ? req.query.sector : [req.query.sector];
    const sectorsCount = await Sector.countDocuments({ _id: { $in: sectors }, company: companyId });
    if (sectors.length !== sectorsCount) throw Boom.forbidden();
  }

  return null;
};

exports.authorizeCustomerDelete = async (req) => {
  const { customer } = req.pre;

  if (customer.firstIntervention) throw Boom.forbidden();

  return null;
};
