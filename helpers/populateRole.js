exports.populateRole = (populatedRole) => {
  const roleToAdd = {
    _id: populatedRole._id,
    name: populatedRole.name,
    features: []
  };
  populatedRole.features.forEach((feature) => {
    roleToAdd.features.push({
      _id: feature.feature_id._id,
      name: feature.feature_id.name,
      permission_level: feature.permission_level
    });
  });
  return roleToAdd;
};
