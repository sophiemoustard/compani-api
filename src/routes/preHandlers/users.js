const Boom = require('boom');
const get = require('lodash/get');
const User = require('../../models/User');
const Sector = require('../../models/Sector');
const Customer = require('../../models/Customer');
const Contract = require('../../models/Contract');
const Establishment = require('../../models/Establishment');
const translate = require('../../helpers/translate');
const UtilsHelper = require('../../helpers/utils');
const { SUPER_ADMIN } = require('../../helpers/constants');
const { auxiliaryHasActiveCompanyContractOnDay } = require('../../helpers/contracts');

const { language } = translate;

exports.getUser = async (req) => {
  try {
    const userId = req.params._id;
    const user = await User.findById(userId).lean();
    if (!user) throw Boom.notFound(translate[language].userNotFound);

    return user;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizeUserUpdate = async (req) => {
  const { credentials } = req.auth;
  const user = req.pre.user || req.payload;
  const companyId = get(credentials, 'company._id', null);

  if (get(req, 'payload.sector', null)) {
    const sector = await Sector.findOne({ _id: req.payload.sector, company: companyId }).lean();
    if (!sector) throw Boom.forbidden();
  }

  const establishmentId = get(req, 'payload.establishment');
  if (establishmentId === null && user.contracts.length) {
    const contracts = await Contract.find({ _id: { $in: user.contracts } }).lean();
    const hasActiveContracts = auxiliaryHasActiveCompanyContractOnDay(contracts, new Date());
    if (hasActiveContracts) throw Boom.forbidden();
  } else if (establishmentId) {
    const establishment = await Establishment.findOne({ _id: establishmentId, company: companyId }).lean();
    if (!establishment) throw Boom.forbidden();
  }

  if (user.company.toHexString() === companyId.toHexString()) return null;

  throw Boom.forbidden();
};

exports.authorizeUserCreation = async (req) => {
  const { credentials } = req.auth;

  if (req.payload.customers && req.payload.customers.length) {
    const { customers } = req.payload;
    const customersCount = await Customer.countDocuments({
      _id: { $in: customers },
      company: get(credentials, 'company._id', null),
    });
    if (customersCount !== customers.length) throw Boom.forbidden();
  }

  if (req.payload.company && !credentials.scope.includes(SUPER_ADMIN)) {
    throw Boom.forbidden();
  }

  return null;
};

exports.authorizeUserGet = async (req) => {
  const { auth, query } = req;
  const companyId = get(auth.credentials, 'company._id', null);

  if (query.email) {
    const user = await User.findOne({ email: query.email, company: companyId }).lean();
    if (!user) throw Boom.forbidden();
  }

  if (query.customers) {
    const customers = UtilsHelper.formatIdsArray(query.customers);
    const customersCount = await Customer.countDocuments({ _id: { $in: customers }, company: companyId });
    if (customersCount !== customers.length) throw Boom.forbidden();
  }

  return null;
};
