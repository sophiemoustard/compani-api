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
  AUXILIARY_WITHOUT_COMPANY,
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
  const userFromDB = req.pre.user;
  const userCompany = userFromDB.company ? userFromDB.company.toHexString() : get(req, 'payload.company');
  const isLoggedUserVendor = !!get(credentials, 'role.vendor');
  const loggedUserClientRole = get(credentials, 'role.client.name');

  checkCompany(credentials, userFromDB, req.payload, isLoggedUserVendor);
  if (get(req, 'payload.establishment')) await checkEstablishment(userCompany, req.payload);
  if (get(req, 'payload.role')) await checkRole(userFromDB, req.payload);
  if (get(req, 'payload.customers')) await checkCustomers(userCompany, req.payload);
  if (!isLoggedUserVendor && (!loggedUserClientRole || loggedUserClientRole === AUXILIARY_WITHOUT_COMPANY)) {
    checkUpdateRestrictions(req.payload);
  }

  return null;
};

const checkCompany = (credentials, userFromDB, payload, isLoggedUserVendor) => {
  const loggedUserCompany = get(credentials, 'company._id') || '';
  const userCompany = userFromDB.company ? userFromDB.company.toHexString() : payload.company;

  const sameCompany = userCompany && loggedUserCompany &&
    UtilsHelper.areObjectIdsEquals(userCompany, loggedUserCompany.toHexString());
  const updatingOwnInfos = UtilsHelper.areObjectIdsEquals(credentials._id, userFromDB._id);
  const canLoggedUserUpdate = isLoggedUserVendor || sameCompany || updatingOwnInfos;

  const isCompanyUpdated = payload.company && userFromDB.company &&
    payload.company !== userFromDB.company.toHexString();

  if (!canLoggedUserUpdate || isCompanyUpdated) throw Boom.forbidden();
};

const checkEstablishment = async (companyId, payload) => {
  const establishment = await Establishment.findOne({ _id: payload.establishment, company: companyId }).lean();
  if (!establishment) throw Boom.forbidden();
};

const checkRole = async (userFromDB, payload) => {
  const role = await Role.findOne({ _id: payload.role }, { name: 1, interface: 1 }).lean();
  const clientRoleSwitch = role.interface === CLIENT && get(userFromDB, 'role.client') &&
      userFromDB.role.client.toHexString() !== payload.role;
  if (clientRoleSwitch) {
    const formerClientRole = await Role.findById(userFromDB.role.client, { name: 1 }).lean();
    const allowedRoleChanges = [
      { from: AUXILIARY, to: PLANNING_REFERENT },
      { from: PLANNING_REFERENT, to: AUXILIARY },
      { from: COACH, to: CLIENT_ADMIN },
      { from: CLIENT_ADMIN, to: COACH },
    ];

    const isRoleUpdateAllowed = allowedRoleChanges.some(({ from, to }) =>
      (from === formerClientRole.name && to === role.name));
    if (!isRoleUpdateAllowed) throw Boom.conflict(translate[language].userRoleConflict);
  }

  const vendorRoleChange = role.interface === VENDOR && !!get(userFromDB, 'role.vendor');
  if (vendorRoleChange) throw Boom.conflict(translate[language].userRoleConflict);
};

const checkCustomers = async (userCompany, payload) => {
  const role = await Role.findOne({ name: HELPER }).lean();
  if (get(payload, 'role', null) !== role._id.toHexString()) throw Boom.forbidden();
  const customerCount = await Customer.countDocuments({ _id: payload.customers[0], company: userCompany });

  if (!customerCount) throw Boom.forbidden();
};

const checkUpdateRestrictions = (payload) => {
  const allowedUpdateKeys = ['firstname', 'lastname', 'phone', 'email'];
  const payloadKeys = (Object.values(payload).map(value => Object.keys(value))).flat();
  if (payloadKeys.some(key => !allowedUpdateKeys.includes(key))) throw Boom.forbidden();
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

  return !!loggedUserHasVendorRole || !!addNewCompanyToTargetUser;
};

exports.authorizeUserCreation = async (req) => {
  const { credentials } = req.auth;
  if (!credentials) checkUpdateRestrictions(req.payload);

  const scope = get(credentials, 'scope');
  if (scope && !scope.includes('users:edit')) throw Boom.forbidden();

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
  const { auth, query } = req;
  const userCompanyId = get(auth, 'credentials.company._id', null);
  const authenticatedUser = await User.findById(get(auth, 'credentials._id')).lean({ autopopulate: true });
  const vendorRole = get(authenticatedUser.role, 'vendor.name');
  const clientRole = get(authenticatedUser.role, 'client.name');
  const isVendorRoleAllowed = [VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER].includes(vendorRole);
  const isClientRoleAllowed = [CLIENT_ADMIN, COACH].includes(clientRole);
  const isQueryCompanyValid = query.company && UtilsHelper.areObjectIdsEquals(query.company, userCompanyId);

  if (!vendorRole && (!isClientRoleAllowed || !isQueryCompanyValid)) throw Boom.forbidden();
  if (!clientRole && !isVendorRoleAllowed) throw Boom.forbidden();
  if (!isClientRoleAllowed && !isVendorRoleAllowed) throw Boom.forbidden();

  return null;
};
