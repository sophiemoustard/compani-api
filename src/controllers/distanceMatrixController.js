const Boom = require('@hapi/boom');
const DistanceMatrixHelper = require('../helpers/distanceMatrix');
const translate = require('../helpers/translate');

const { language } = translate;

const list = async (req) => {
  try {
    const distanceMatrices = await DistanceMatrixHelper.getDistanceMatrices(req.query, req.auth.credentials);

    return {
      message: distanceMatrices.length
        ? translate[language].distanceMatrixFound
        : translate[language].distanceMatrixNotFound,
      data: { distanceMatrices },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = {
  list,
};
