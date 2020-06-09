const Boom = require('@hapi/boom');

const versionHelper = require('../helpers/version');
const translate = require('../helpers/translate');

const { language } = translate;

const checkUpdate = async (req) => {
  try {
    const mustUpdate = await versionHelper.checkUpdate(req.query.apiVersion);

    return {
      message: translate[language].apiVersionFound,
      data: { mustUpdate },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = {
  checkUpdate,
};
