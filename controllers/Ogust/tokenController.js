const translate = require('../../helpers/translate');
const { getToken } = require('../../models/Ogust/Token');
const Boom = require('boom');

const { language } = translate;

const getOgustToken = async (req) => {
  try {
    const newToken = await getToken();
    return {
      message: translate[language].OgustGetTokenOk,
      data: newToken.data
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

module.exports = { getOgustToken };
