const Boom = require('boom');
const translate = require('../../helpers/translate');
const maps = require('../../models/Google/Maps');

const { language } = translate;

const getDistanceMatrix = async (req) => {
  try {
    req.query.key = process.env.GOOGLE_CLOUD_PLATFORM_API_KEY;
    const direction = await maps.getDistanceMatrix(req.query);
    return {
      message: translate[language].directionGotten,
      data: direction.data
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

module.exports = {
  getDistanceMatrix
};
