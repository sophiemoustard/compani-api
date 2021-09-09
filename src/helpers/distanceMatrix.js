const get = require('lodash/get');
const DistanceMatrix = require('../models/DistanceMatrix');
const maps = require('../models/Google/Maps');
const { TRANSIT, WALKING, PUBLIC_TRANSPORT } = require('./constants');

exports.getDistanceMatrices = async credentials =>
  DistanceMatrix.find({ company: get(credentials, 'company._id') }).lean();

exports.getOrCreateDistanceMatrix = async (params, companyId) => {
  let res = null;
  if (params.mode === TRANSIT || params.mode === PUBLIC_TRANSPORT) {
    const queryWithTransit = { ...params, mode: TRANSIT, key: process.env.GOOGLE_CLOUD_PLATFORM_API_KEY };
    const resWithTransit = await maps.getDistanceMatrix(queryWithTransit);
    const transitDistance = resWithTransit.data.rows[0].elements[0].distance.value;
    const queryWithWalking = { ...params, mode: WALKING, key: process.env.GOOGLE_CLOUD_PLATFORM_API_KEY };
    const resWithWalking = await maps.getDistanceMatrix(queryWithWalking);
    const walkingDistance = resWithWalking.data.rows[0].elements[0].distance.value;

    res = transitDistance < walkingDistance ? resWithTransit : resWithWalking;
  } else {
    const query = { ...params, key: process.env.GOOGLE_CLOUD_PLATFORM_API_KEY };
    res = await maps.getDistanceMatrix(query);
  }

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
