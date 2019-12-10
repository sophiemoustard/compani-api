const Boom = require('boom');
const translate = require('../../helpers/translate');
const { getNewDistanceMatrix } = require('../../helpers/map');

const { language } = translate;

const getDistanceMatrix = async (req) => {
  try {
    const newDistanceMatrix = await getNewDistanceMatrix(req.query, req.auth.credentials);

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
