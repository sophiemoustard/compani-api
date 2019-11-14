const Boom = require('boom');
const translate = require('../../helpers/translate');
const { getOrCreateDistanceMatrix } = require('../../helpers/distanceMatrix');

const { language } = translate;

const getDistanceMatrix = async (req) => {
  try {
    const params = {
      origins: req.query.origins,
      destinations: req.query.destinations,
      mode: req.query.mode,
    };
    const newDistanceMatrix = await getOrCreateDistanceMatrix(params);
    if (!newDistanceMatrix) return { message: translate[language].distanceMatrixNotFound };

    return {
      message: translate[language].distanceMatrixFound,
      data: newDistanceMatrix,
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = {
  getDistanceMatrix,
};
