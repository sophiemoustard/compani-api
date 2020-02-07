const Role = require('../models/Role');

exports.processingRights = rights => rights.map((right) => {
  if (right.right_id && right.right_id._id && (right.right_id.name || right.right_id.permission)) {
    return {
      right_id: right.right_id._id,
      permission: right.right_id.permission,
      description: right.right_id.description,
      hasAccess: right.hasAccess,
    };
  }
});

exports.populateRole = (rights, onlyGrantedRights = false) => {
  const filteredRights = onlyGrantedRights ? rights.filter(right => right.hasAccess) : rights;

  return exports.processingRights(filteredRights);
};

exports.populateRoles = roles => roles.map(role => ({ ...role, rights: exports.populateRole(role.rights) }));

exports.list = async (query) => {
  const roles = await Role.find(query).lean({ autopopulate: true });

  return exports.populateRoles(roles);
};
