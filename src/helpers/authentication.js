const jwt = require('jsonwebtoken');
const get = require('lodash');
const User = require('../models/User');
const { AUXILIARY_WITHOUT_COMPANY } = require('./constants');

const encode = (payload, expireTime) => jwt.sign(payload, process.env.TOKEN_SECRET, { expiresIn: expireTime || '24h' });

const validate = async (decoded) => {
  try {
    if (!decoded._id) throw new Error('No id / role present in token');
    const user = await User
      .findById(decoded._id, '_id identity role company local customers sector')
      .lean({ autopopulate: true });
    if (!user.company) return { isValid: false };

    const rights = user.role.rights.filter(right => right.hasAccess).map((right) => {
      if (right.permission) return right.permission;
    });

    const customersScopes = user.customers ? user.customers.map(id => `customer-${id.toHexString()}`) : [];
    const scope = [`user:read-${decoded._id}`, user.role.name, ...rights, ...customersScopes];
    if (user.role.name !== AUXILIARY_WITHOUT_COMPANY) scope.push(`user:edit-${decoded._id}`);

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
