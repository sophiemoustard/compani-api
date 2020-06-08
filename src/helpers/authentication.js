const jwt = require('jsonwebtoken');
const get = require('lodash/get');
const pick = require('lodash/pick');
const User = require('../models/User');
const { rights } = require('../data/rights');
const { AUXILIARY_WITHOUT_COMPANY, CLIENT_ADMIN, TRAINER, CLIENT } = require('./constants');

const encode = (payload, expireTime) => jwt.sign(payload, process.env.TOKEN_SECRET, { expiresIn: expireTime || '24h' });

const formatRights = (roles, company) => {
  const formattedRights = [];
  for (const role of roles) {
    let interfaceRights = rights;

    if (role.interface === CLIENT) {
      const companySubscriptions = Object.keys(company.subscriptions).filter(key => company.subscriptions[key]);
      interfaceRights = interfaceRights.filter(r => !r.subscription || companySubscriptions.includes(r.subscription));
    }

    interfaceRights = interfaceRights
      .filter(right => right.roleConcerned.includes(role.name))
      .map(right => right.permission);

    interfaceRights.forEach((right) => { if (!formattedRights.includes(right)) formattedRights.push(right); });
  }

  return formattedRights;
};

const validate = async (decoded) => {
  try {
    if (!decoded._id) throw new Error('No id present in token');
    const user = await User.findById(decoded._id, '_id identity role company local customers')
      .populate({ path: 'sector', options: { processingAuthentication: true } })
      .lean({ autopopulate: true });
    if (!user.company && get(user, 'role.vendor.name') !== TRAINER) return { isValid: false };

    const userRoles = user.role ? Object.values(user.role).filter(role => !!role) : [];

    const userRolesName = userRoles.map(role => role.name);
    const userRights = formatRights(userRoles, user.company);

    const customersScopes = user.customers ? user.customers.map(id => `customer-${id.toHexString()}`) : [];
    const scope = [`user:read-${decoded._id}`, ...userRolesName, ...userRights, ...customersScopes];

    console.log(scope);

    if (get(user, 'role.client.name') !== AUXILIARY_WITHOUT_COMPANY) scope.push(`user:edit-${decoded._id}`);
    if (get(user, 'role.client.name') === CLIENT_ADMIN) scope.push(`company-${user.company._id}`);

    const credentials = {
      email: get(user, 'local.email', null),
      _id: decoded._id,
      identity: user.identity || null,
      company: user.company,
      sector: user.sector ? user.sector.toHexString() : null,
      role: pick(user.role, ['client.name', 'vendor.name']),
      scope,
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
