const Boom = require('boom');
const translate = require('../helpers/translate');
const { getDraftPay } = require('../helpers/draftPay');
const { createPayList } = require('../helpers/pay');

const { language } = translate;

const draftPayList = async (req) => {
  try {
    const draftPay = await getDraftPay(req.query, req.auth.credentials);

    return {
      message: translate[language].draftPay,
      data: { draftPay },
    };
  } catch (e) {
    req.log('error', e);
    Boom.badImplementation(e);
  }
};

const createList = async (req) => {
  try {
    await createPayList(req.payload);

    return { message: translate[language].payListCreated };
  } catch (e) {
    req.log('error', e);
    Boom.badImplementation(e);
  }
};

module.exports = {
  draftPayList,
  createList,
};
