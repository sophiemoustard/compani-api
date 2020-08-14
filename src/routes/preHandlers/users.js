const Boom = require('@hapi/boom');
const get = require('lodash/get');
const has = require('lodash/has');
const User = require('../../models/User');
const Role = require('../../models/Role');
const Customer = require('../../models/Customer');
const Establishment = require('../../models/Establishment');
const translate = require('../../helpers/translate');
const UtilsHelper = require('../../helpers/utils');
const {
  CLIENT_ADMIN,
  COACH,
  AUXILIARY,
  PLANNING_REFERENT,
  HELPER,
  VENDOR_ADMIN,
  TRAINING_ORGANISATION_MANAGER,
  CLIENT,
  VENDOR,
} = require('../../helpers/constants');

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
  const isVendorUser = get(credentials, 'role.vendor', null);
  const establishmentId = get(req, 'payload.establishment');
  const payloadRole = get(req, 'payload.role');

  if (establishmentId) {
    const establishment = await Establishment.findOne({ _id: establishmentId, company: companyId }).lean();
    if (!establishment) throw Boom.forbidden();
  }

  const userCompany = get(req, 'pre.user.company') ? req.pre.user.company.toHexString() : get(req, 'payload.company');
  if (!isVendorUser && (!userCompany || userCompany !== companyId.toHexString())) throw Boom.forbidden();

  if (get(req, 'payload.company') && user.company &&
    get(req, 'payload.company') !== user.company.toHexString()) throw Boom.forbidden();

  if (payloadRole) {
    const userInDB = req.pre.user;
    const newRole = await Role.findById(payloadRole, { name: 1, interface: 1 }).lean();
    const clientRoleSwitch = newRole.interface === CLIENT && get(userInDB, 'role.client') &&
      userInDB.role.client.toHexString() !== payloadRole;
    if (clientRoleSwitch) {
      const formerClientRole = await Role.findById(userInDB.role.client, { name: 1 }).lean();
      const allowedRoleChanges = [
        { from: AUXILIARY, to: PLANNING_REFERENT },
        { from: PLANNING_REFERENT, to: AUXILIARY },
        { from: COACH, to: CLIENT_ADMIN },
        { from: CLIENT_ADMIN, to: COACH },
      ];

      let forbiddenRoleChange = true;
      allowedRoleChanges.forEach((roleSwitch) => {
        if (roleSwitch.from === formerClientRole.name && roleSwitch.to === newRole.name) forbiddenRoleChange = false;
      });
      if (forbiddenRoleChange) throw Boom.conflict(translate[language].userRoleConflict);
    }

    const vendorRoleChange = newRole.interface === VENDOR && !!get(userInDB, 'role.vendor');
    if (vendorRoleChange) throw Boom.conflict(translate[language].userRoleConflict);
  }

  if (get(req, 'payload.customers')) {
    const role = await Role.findOne({ name: HELPER }).lean();
    if (get(req.payload, 'role', null) !== role._id.toHexString()) throw Boom.forbidden();
    const customer = await Customer.findOne({ _id: req.payload.customers[0] }).lean();

    if (userCompany !== customer.company.toHexString()) throw Boom.forbidden();
  }

  return null;
};

exports.authorizeUserGetById = async (req) => {
  const { credentials } = req.auth;
  const user = req.pre.user || req.payload;
  const companyId = get(credentials, 'company._id', null);
  const isVendorUser = get(credentials, 'role.vendor', null);
  const establishmentId = get(req, 'payload.establishment');

  if (establishmentId) {
    const establishment = await Establishment.findOne({ _id: establishmentId, company: companyId }).lean();
    if (!establishment) throw Boom.forbidden();
  }

  const isClientFromDifferentCompany = !isVendorUser && user.company &&
    user.company.toHexString() !== companyId.toHexString();
  if (isClientFromDifferentCompany) throw Boom.forbidden();

  return null;
};

exports.authorizeUserDeletion = async (req) => {
  const { credentials } = req.auth;
  const { user } = req.pre;
  const companyId = get(credentials, 'company._id') || null;

  const clientRoleId = get(user, 'role.client');
  if (!clientRoleId) throw Boom.forbidden();

  const role = await Role.findById(clientRoleId).lean();
  if (role.name !== HELPER) throw Boom.forbidden();

  if (user.company.toHexString() !== companyId.toHexString()) throw Boom.forbidden();

  return null;
};

exports.authorizeUserUpdateWithoutCompany = (req) => {
  const { credentials } = req.auth;
  const addNewCompanyToTargetUser = !req.pre.user.company && req.payload.company;
  const loggedUserHasVendorRole = get(credentials, 'role.vendor', null);

  return loggedUserHasVendorRole || addNewCompanyToTargetUser;
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

exports.authorizeLearnersGet = async (req) => {
  const vendorRole = get(req, 'auth.credentials.role.vendor.name');
  if (![VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER].includes(vendorRole)) throw Boom.forbidden();
  return null;
};
