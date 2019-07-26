const User = require('../models/User');
const jwt = require('jsonwebtoken');

const encode = (payload, expireTime) => jwt.sign(payload, process.env.TOKEN_SECRET, { expiresIn: expireTime || '24h' });

const validate = async (decoded, req) => {
  try {
    if (req.route.path === '/ogust/token') {
      if (decoded) {
        return { isValid: true };
      }
      return { isValid: false };
    }

    if (!decoded._id) throw new Error('No id / role present in token');
    const user = await User.findById(decoded._id, '_id identity role company local');

    const rights = user.role.rights.filter(right => right.hasAccess).map((right) => {
      if (right.right_id && right.right_id.permission) return right.right_id.permission;
    });

    const credentials = {
      _id: decoded._id,
      identity: user.identity || null,
      email: user.local && user.local.email ? user.local.email : null,
      company: user.company || null,
      scope: [`user-${decoded._id}`, user.role.name, ...rights],
    };

    return {
      isValid: true,
      credentials,
    };
  } catch (e) {
    console.error(e);
    return {
      isValid: false,
    };
  }
};

module.exports = {
  encode,
  validate,
};
