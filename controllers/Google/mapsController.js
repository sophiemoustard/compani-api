const Boom = require('boom');
const translate = require('../../helpers/translate');
const maps = require('../../models/Google/Maps');
const DistanceMatrix = require('../../models/DistanceMatrix');

const { language } = translate;

const getDistanceMatrix = async (req) => {
  try {
    const params = {
      origin: req.query.origins,
      destination: req.query.destinations,
      mode: req.query.mode,
    };
    const distanceMatrix = await DistanceMatrix.findOne(params);

    if (distanceMatrix) {
      return {
        message: translate[language].distanceMatrixFound,
        data: distanceMatrix,
      };
    }

    req.query.key = process.env.GOOGLE_CLOUD_PLATFORM_API_KEY;
    const res = await maps.getDistanceMatrix(req.query);
    if (res.status !== 'OK' || !res.data.rows[0] || !res.data.rows[0].elements || !res.data.rows[0].elements[0].duration || !res.data.rows[0].elements[0].distance) {
      return { message: translate[language].distanceMatrixNotFound };
    }

    const payload = new DistanceMatrix({
      ...params,
      distance: res.data.rows[0].elements[0].distance.value,
      duration: res.data.rows[0].elements[0].duration.value,
    });
    const newDistanceMatrix = await payload.save();

    return {
      message: translate[language].distanceMatrixFound,
      data: newDistanceMatrix,
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

module.exports = {
  getDistanceMatrix
};
