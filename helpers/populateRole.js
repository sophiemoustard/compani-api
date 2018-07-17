exports.populateRole = rights => rights.map((right) => {
  if (right.right_id && right.right_id._id && right.right_id.name) {
    return {
      _id: right.right_id._id,
      name: right.right_id.name,
      permission: right.right_id.permission,
      description: right.right_id.description,
      rolesAllowed: right.rolesAllowed,
      hasAccess: right.hasAccess
    };
  }
});
