const Boom = require('@hapi/boom');
const translate = require('../helpers/translate');
const { getDraftPay } = require('../helpers/draftPay');
const DpaeHelper = require('../helpers/dpae');
const { createPayList, hoursBalanceDetail, getHoursToWorkBySector } = require('../helpers/pay');
const { CONTRACT, CONTRACT_VERSION } = require('../helpers/constants');

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
    const detail = await hoursBalanceDetail(query, auth.credentials);
    return {
      message: translate[language].hoursBalanceDetail,
      data: { hoursBalanceDetail: detail },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const getHoursToWork = async (req) => {
  try {
    const hoursToWork = await getHoursToWorkBySector(req.query, req.auth.credentials);

    return {
      message: translate[language].hoursToWorkFound,
      data: { hoursToWork },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const exportDsnInfo = async (req, h) => {
  try {
    let txt = '';
    switch (req.params.type) {
      case CONTRACT:
        txt = await DpaeHelper.exportContracts(req.query, req.auth.credentials);
        break;
      case CONTRACT_VERSION:
        txt = await DpaeHelper.exportContractVersions(req.query, req.auth.credentials);
        break;
    }

    return h.file(txt, { confine: false });
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = {
  draftPayList,
  createList,
  getHoursBalanceDetails,
  getHoursToWork,
  exportDsnInfo,
};
