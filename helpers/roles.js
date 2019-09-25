const _ = require('lodash');

const processingRights = rights => rights.map((right) => {
  if (right.right_id && right.right_id._id && (right.right_id.name || right.right_id.permission)) {
    return {
      right_id: right.right_id._id,
      permission: right.right_id.permission,
      description: right.right_id.description,
      hasAccess: right.hasAccess,
    };
  }
});

const populateRole = (rights, options) => {
  if (options && options.onlyGrantedRights) {
    const filteredRights = rights.filter(right => right.hasAccess);
    return processingRights(filteredRights);
  }
  return processingRights(rights);
};

const populateRoles = roles => roles.map((role) => {
  role = role.toObject();
  if (_.isArray(role.rights)) role.rights = populateRole(role.rights);

  return role;
});

module.exports = {
  populateRole,
  populateRoles,
};
