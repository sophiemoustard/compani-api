const processingRights = rights => rights.map((right) => {
  if (right.right_id && right.right_id._id && (right.right_id.name || right.right_id.permission)) {
    return {
      right_id: right.right_id._id,
      name: right.right_id.name || '',
      permission: right.right_id.permission,
      description: right.right_id.description,
      rolesConcerned: right.rolesConcerned,
      hasAccess: right.hasAccess
    };
  }
});

exports.populateRole = (rights, options) => {
  if (options && options.onlyGrantedRights) {
    const filteredRights = rights.filter(right => right.hasAccess);
    return processingRights(filteredRights);
  }
  return processingRights(rights);
};
