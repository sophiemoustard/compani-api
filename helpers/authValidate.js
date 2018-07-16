const Role = require('../models/Role');

exports.validate = async (decoded) => {
  try {
    if (!decoded.role) throw new Error('Missing role in token !');
    const decodedRole = typeof decoded.role === 'string' ? decoded.role : decoded.role.name;
    const role = await Role.find({
      name: decodedRole
    });
    let rights = [];
    if (!role[0].features) { // temporary, it will be removed after RBAC migration is complete
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
  }
};
