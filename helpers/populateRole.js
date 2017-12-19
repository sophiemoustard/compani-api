exports.populateRole = (features) => {
  const formattedFeatures = [];
  features.forEach((feature) => {
    if (feature.feature_id && feature.feature_id._id && feature.feature_id.name) {
      formattedFeatures.push({
        _id: feature.feature_id._id,
        name: feature.feature_id.name,
        permission_level: feature.permission_level
      });
    }
  });
  return formattedFeatures;
};
