const translate = require('../../helpers/translate');
const token = require('../../models/Ogust/Token');
const Boom = require('boom');

const { language } = translate;

const get = async (req) => {
  try {
    const newToken = await token.getToken();
    return {
      message: translate[language].OgustGetTokenOk,
      data: newToken.data
    };
  } catch (e) {
    req.log('error', e);
    Boom.badImplementation();
  }
};

module.exports = { get };
