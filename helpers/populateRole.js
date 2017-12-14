exports.populateRole = (features) => {
  // const roleToAdd = {
  //   _id: populatedRole._id,
  //   name: populatedRole.name,
  //   features: []
  // };
  const formattedFeatures = [];
  features.forEach((feature) => {
    formattedFeatures.push({
      _id: feature.feature_id._id,
      name: feature.feature_id.name,
      permission_level: feature.permission_level
    });
  });
  return formattedFeatures;
};
