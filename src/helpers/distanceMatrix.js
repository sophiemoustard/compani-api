const get = require('lodash/get');
const DistanceMatrix = require('../models/DistanceMatrix');
const maps = require('../models/Google/Maps');

exports.getDistanceMatrices = async credentials =>
  DistanceMatrix.find({ company: get(credentials, 'company._id') || null }).lean();

exports.getOrCreateDistanceMatrix = async (params, companyId) => {
  const distanceMatrix = await DistanceMatrix.findOne(params);

  if (distanceMatrix) return distanceMatrix;

  const query = { ...params, key: process.env.GOOGLE_CLOUD_PLATFORM_API_KEY };
  const res = await maps.getDistanceMatrix(query);
  if (res.status !== 200 || !res.data.rows[0] || !res.data.rows[0].elements ||
    !res.data.rows[0].elements[0].duration || !res.data.rows[0].elements[0].distance) {
    return null;
  }

  const payload = new DistanceMatrix({
    ...params,
    company: companyId,
    distance: res.data.rows[0].elements[0].distance.value,
    duration: res.data.rows[0].elements[0].duration.value,
  });
  const newDistanceMatrix = await payload.save();

  return newDistanceMatrix;
};
