const Boom = require('@hapi/boom');
const translate = require('../helpers/translate');
const { getDraftFinalPay } = require('../helpers/draftFinalPay');
const { createFinalPayList } = require('../helpers/finalPay');

const { language } = translate;

const draftFinalPayList = async (req) => {
  try {
    const draftFinalPay = await getDraftFinalPay(req.query, req.auth.credentials);

    return {
      message: translate[language].draftFinalPay,
      data: { draftFinalPay },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const createList = async (req) => {
  try {
    await createFinalPayList(req.payload, req.auth.credentials);

    return { message: translate[language].finalPayListCreated };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { draftFinalPayList, createList };
