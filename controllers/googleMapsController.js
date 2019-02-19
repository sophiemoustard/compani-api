const axios = require('axios');
const Boom = require('boom');
const translate = require('../helpers/translate');

const { language } = translate;

const getDirectionInfo = async (req) => {
  try {
    req.query.key = process.env.GOOGLE_CLOUD_PLATFORM_API_KEY;
    const direction = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', { params: req.query });
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
  getDirectionInfo
};
