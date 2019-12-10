const Boom = require('boom');
const DistanceMatrixHelper = require('../helpers/distanceMatrix');
const translate = require('../helpers/translate');

const { language } = translate;

const list = async (req) => {
  try {
    const distanceMatrix = await DistanceMatrixHelper.getDistanceMatrix(req.query, req.auth.credentials);

    if (!distanceMatrix.length) return { message: translate[language].distanceMatrixNotFound };
    return {
      message: translate[language].distanceMatrixFound,
      data: { distanceMatrix },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = {
  list,
};
