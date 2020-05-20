const jwt = require('jsonwebtoken');
const get = require('lodash/get');
const pick = require('lodash/pick');
const User = require('../models/User');
const { defineAbilitiesFor } = require('./ability');
const { AUXILIARY_WITHOUT_COMPANY, CLIENT_ADMIN, TRAINER, CLIENT } = require('./constants');

const encode = (payload, expireTime) => jwt.sign(payload, process.env.TOKEN_SECRET, { expiresIn: expireTime || '24h' });

const formatRights = (roles, company) => {
  const formattedRights = [];
  for (const role of roles) {
    let rights = [...role.rights];
    if (role.interface === CLIENT) {
      const companySubscriptions = Object.keys(company.subscriptions).filter(key => company.subscriptions[key]);
      rights = role.rights.filter(r => !r.subscription || companySubscriptions.includes(r.subscription));
    }

    formattedRights.push(...rights
      .filter(right => right.hasAccess)
      .map((right) => { if (right.permission) return right.permission; }));
  }

  return formattedRights;
};

const validate = async (decoded) => {
  try {
    if (!decoded._id) throw new Error('No id present in token');
    const user = await User.findById(decoded._id, '_id identity role company local customers sector')
      .lean({ autopopulate: true });
    if (!user.company && get(user, 'role.vendor.name') !== TRAINER) return { isValid: false };

    const userRoles = Object.values(user.role).filter(role => !!role);
    if (!userRoles.length) return { isValid: false };

    const userRolesName = userRoles.map(role => role.name);
    const rights = formatRights(userRoles, user.company);

    const customersScopes = user.customers ? user.customers.map(id => `customer-${id.toHexString()}`) : [];
    const scope = [`user:read-${decoded._id}`, ...userRolesName, ...rights, ...customersScopes];
    if (get(user, 'role.client.name') !== AUXILIARY_WITHOUT_COMPANY) scope.push(`user:edit-${decoded._id}`);
    if (get(user, 'role.client.name') === CLIENT_ADMIN) scope.push(`company-${user.company._id}`);
    if (get(user, 'role.vendor.name') === TRAINER) scope.push(`courses:read-${user._id}`);

    const ability = defineAbilitiesFor(user);

    const credentials = {
      email: get(user, 'local.email', null),
      _id: decoded._id,
      identity: user.identity || null,
      company: user.company,
      sector: user.sector ? user.sector.toHexString() : null,
      role: pick(user.role, ['client.name', 'vendor.name']),
      scope,
      ability,
    };

    return { isValid: true, credentials };
  } catch (e) {
    console.error(e);
    return { isValid: false };
  }
};

module.exports = {
  encode,
  validate,
};
