const distanceMatrixHelper = require('../helpers/distanceMatrix');

exports.getNewDistanceMatrix = async (query, credentials) =>
  distanceMatrixHelper.getOrCreateDistanceMatrix(query, credentials);
