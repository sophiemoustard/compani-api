const Boom = require('boom');

const translate = require('../../helpers/translate');
const utils = require('../../models/Ogust/Utils');

const { language } = translate;

const getList = async (req) => {
  try {
    const params = {
      token: req.headers['x-ogust-token'],
      key: req.query.key
    };
    const list = await utils.getList(params);
    if (list.data.status == 'KO') {
      return Boom.badRequest(list.data.message);
    }
    return {
      message: translate[language].OgustGetListOk,
      data: list.data
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

module.exports = { getList };
