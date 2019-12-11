const Boom = require('boom');
const translate = require('../helpers/translate');
const { getDraftPay } = require('../helpers/draftPay');
const { createPayList, hoursBalanceDetail } = require('../helpers/pay');

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
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const createList = async (req) => {
  try {
    await createPayList(req.payload, req.auth.credentials);

    return { message: translate[language].payListCreated };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const getHoursBalanceDetails = async (req) => {
  try {
    const { query, auth } = req;
    const detail = await hoursBalanceDetail(query.auxiliary, query.month, auth.credentials);

    return {
      message: translate[language].hoursBalanceDetail,
      data: { hoursBalanceDetail: detail },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = {
  draftPayList,
  createList,
  getHoursBalanceDetails,
};
