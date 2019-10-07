const Boom = require('boom');
const DistanceMatrix = require('../models/DistanceMatrix');
const translate = require('../helpers/translate');

const { language } = translate;

const list = async (req) => {
  try {
    const distanceMatrix = await DistanceMatrix.find(req.query);

    return {
      message: translate[language].distanceMatrixFound,
      data: { distanceMatrix }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

module.exports = {
  list,
};
