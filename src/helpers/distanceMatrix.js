const get = require('lodash/get');
const DistanceMatrix = require('../models/DistanceMatrix');
const maps = require('../models/Google/Maps');
const { TRANSIT, WALKING } = require('./constants');

exports.getDistanceMatrices = async credentials =>
  DistanceMatrix.find({ company: get(credentials, 'company._id') }).lean();

const isDistanceMatrixDefine = (res) => {
  if (res.status !== 200 || !res.data.rows[0] || !res.data.rows[0].elements ||
    !res.data.rows[0].elements[0].duration || !res.data.rows[0].elements[0].distance) {
    return false;
  }

  return true;
};

exports.getOrCreateDistanceMatrix = async (params, companyId) => {
  let res = null;
  const query = { ...params, key: process.env.GOOGLE_CLOUD_PLATFORM_API_KEY };
  if (params.mode === TRANSIT) {
    const resWithTransit = await maps.getDistanceMatrix(query);
    const queryWithWalking = { ...params, mode: WALKING, key: process.env.GOOGLE_CLOUD_PLATFORM_API_KEY };
    const resWithWalking = await maps.getDistanceMatrix(queryWithWalking);

    if (!isDistanceMatrixDefine(resWithTransit) || !isDistanceMatrixDefine(resWithWalking)) return null;

    const transitDistance = resWithTransit.data.rows[0].elements[0].distance.value;
    const walkingDistance = resWithWalking.data.rows[0].elements[0].distance.value;
    res = transitDistance < walkingDistance ? resWithTransit : resWithWalking;
  } else {
    res = await maps.getDistanceMatrix(query);
  }

  if (!isDistanceMatrixDefine(res)) return null;

  const payload = new DistanceMatrix({
    ...params,
    company: companyId,
    distance: res.data.rows[0].elements[0].distance.value,
    duration: res.data.rows[0].elements[0].duration.value,
  });
  const newDistanceMatrix = await payload.save();

  return newDistanceMatrix;
};
