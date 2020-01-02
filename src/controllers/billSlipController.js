const Boom = require('boom');
const BillSlipsHelper = require('../helpers/billSlips');
const translate = require('../helpers/translate');

const { language } = translate;

const list = async (req) => {
  try {
    const billSlips = await BillSlipsHelper.list(req.auth.credentials);

    return {
      message: translate[language].billSlipsFound,
      data: { billSlips },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation();
  }
};

module.exports = {
  list,
};
