const get = require('lodash/get');
const DistanceMatrix = require('../models/DistanceMatrix');
const maps = require('../models/Google/Maps');
const { TRANSIT, WALKING } = require('./constants');

exports.getDistanceMatrices = async credentials =>
  DistanceMatrix.find({ company: get(credentials, 'company._id') }).lean();

const isDistanceMatrixDefine = res => (res.status === 200 && get(res, 'data.rows[0].elements[0].distance') &&
  get(res, 'data.rows[0].elements[0].duration'));

exports.getOrCreateDistanceMatrix = async (params, companyId) => {
  const distanceMatrix = await DistanceMatrix.findOne(params).lean();
  if (distanceMatrix) return distanceMatrix;

  let res = null;
  const query = { ...params, key: process.env.GOOGLE_CLOUD_PLATFORM_API_KEY };
  if (params.mode === TRANSIT) {
    const resWithTransit = await maps.getDistanceMatrix(query);
    const queryWithWalking = { ...query, mode: WALKING };
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
