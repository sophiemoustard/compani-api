const Boom = require('boom');
const translate = require('../../helpers/translate');
const maps = require('../../models/Google/Maps');

const { language } = translate;

const getDistanceMatrix = async (req) => {
  try {
    req.query.key = process.env.GOOGLE_CLOUD_PLATFORM_API_KEY;
    const res = await maps.getDistanceMatrix(req.query);
    let message = '';
    if (res.status === 'OK') {
      message = translate[language].distanceMatrixFound;
    } else {
      message = translate[language].distanceMatrixNotFound;
    }
    return {
      message,
      data: res.data
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

module.exports = {
  getDistanceMatrix
};
