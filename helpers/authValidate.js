const Role = require('../models/Role');

exports.validate = async (decoded) => {
  try {
    const role = await Role.find({
      name: decoded.role
    });
    const features = role[0].rights.filter(right => right.hasAccess).map((right) => {
      if (right.right_id && right.right_id.permission) return right.right_id.permission;
    });
    const credentials = {
      _id: decoded._id,
      scope: [`user-${decoded._id}`, decoded.role, ...features]
    };
    return {
      isValid: true,
      credentials
    };
  } catch (e) {
    console.error(e);
  }
};
