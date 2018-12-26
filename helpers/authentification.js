const Role = require('../models/Role');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const encode = (payload, expireTime) => jwt.sign(payload, process.env.TOKEN_SECRET, { expiresIn: expireTime || '24h' });

const validate = async (decoded, req) => {
  try {
    if (req.route.path === '/ogust/token') {
      if (decoded) {
        return {
          isValid: true
        };
      }
      return {
        isValid: false
      };
    }
    if (!decoded.role && decoded._id) {
      const user = await User.findById(decoded._id);
      decoded.role = user.role;
    } else if (!decoded.role && !decoded._id) {
      throw new Error('No id / role present in token');
    }
    const decodedRole = typeof decoded.role === 'string' ? decoded.role : decoded.role.name;
    const role = await Role.find({
      name: decodedRole
    });
    let rights = [];
    if (role[0].features.length === 0) { // temporary, it will be removed after RBAC migration is complete
      if (role.length === 0) throw new Error('Role not found !');
      if (role[0].rights.length === 0) throw new Error('Rights are not set !');
      rights = role[0].rights.filter(right => right.hasAccess).map((right) => {
        if (right.right_id && right.right_id.permission) return right.right_id.permission;
      });
    }
    const credentials = {
      _id: decoded._id,
      scope: [`user-${decoded._id}`, decodedRole, ...rights]
    };
    return {
      isValid: true,
      credentials
    };
  } catch (e) {
    console.error(e);
    return {
      isValid: false
    };
  }
};

module.exports = {
  encode,
  validate
};
