const Boom = require('@hapi/boom');
const get = require('lodash/get');
const has = require('lodash/has');
const User = require('../../models/User');
const Customer = require('../../models/Customer');
const Establishment = require('../../models/Establishment');
const translate = require('../../helpers/translate');
const UtilsHelper = require('../../helpers/utils');
const { VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER } = require('../../helpers/constants');

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

exports.authorizeUserUpdateOrGetById = async (req) => {
  const { credentials } = req.auth;
  const user = req.pre.user || req.payload;
  const companyId = get(credentials, 'company._id', null);

  const isVendorUser = get(credentials, 'role.vendor', null);
  const establishmentId = get(req, 'payload.establishment');
  if (establishmentId) {
    const establishment = await Establishment.findOne({ _id: establishmentId, company: companyId }).lean();
    if (!establishment) throw Boom.forbidden();
  }

  if (!isVendorUser && user.company.toHexString() !== companyId.toHexString()) throw Boom.forbidden();

  return null;
};

exports.authorizeUserUpdateWithoutCompany = (req) => {
  const { credentials } = req.auth;
  return get(credentials, 'role.vendor', null) && credentials.scope.includes('users:edit');
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

  const vendorRole = get(credentials, 'role.vendor.name');
  if (req.payload.company && ![VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER].includes(vendorRole)) {
    throw Boom.forbidden();
  }

  return null;
};

exports.authorizeUserGet = async (req) => {
  const { auth, query } = req;
  const userCompanyId = get(auth, 'credentials.company._id', null);
  const queryCompanyId = query.company;
  const authenticatedUser = await User.findById(get(auth, 'credentials._id')).lean({ autopopulate: true });

  if (!has(authenticatedUser, 'role.vendor') && !queryCompanyId) throw Boom.forbidden();
  if (!has(authenticatedUser, 'role.vendor') && queryCompanyId !== userCompanyId.toHexString()) throw Boom.forbidden();

  if (query.email) {
    const user = await User.findOne({ email: query.email, company: userCompanyId }).lean();
    if (!user) throw Boom.forbidden();
  }

  if (query.customers) {
    const customers = UtilsHelper.formatIdsArray(query.customers);
    const customersCount = await Customer.countDocuments({ _id: { $in: customers }, company: userCompanyId });
    if (customersCount !== customers.length) throw Boom.forbidden();
  }

  return null;
};
