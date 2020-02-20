const jwt = require('jsonwebtoken');
const get = require('lodash/get');
const User = require('../models/User');
const { AUXILIARY_WITHOUT_COMPANY } = require('./constants');

const encode = (payload, expireTime) => jwt.sign(payload, process.env.TOKEN_SECRET, { expiresIn: expireTime || '24h' });

const formatRights = (roles) => {
  const formattedRights = [];
  for (const role of roles) {
    formattedRights.push(...role.rights
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
    if (!user.company) return { isValid: false };

    const userRoles = Object.values(user.role);
    const userRolesName = userRoles.map(role => role.name);
    const rights = formatRights(userRoles);

    const customersScopes = user.customers ? user.customers.map(id => `customer-${id.toHexString()}`) : [];
    const scope = [`user:read-${decoded._id}`, ...userRolesName, ...rights, ...customersScopes];
    if (user.role.client.name !== AUXILIARY_WITHOUT_COMPANY) scope.push(`user:edit-${decoded._id}`);

    const credentials = {
      _id: decoded._id,
      identity: user.identity || null,
      email: get(user, 'local.email', null),
      company: user.company,
      sector: user.sector ? user.sector.toHexString() : null,
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
