const Boom = require('@hapi/boom');
const translate = require('../helpers/translate');
const { getDraftPay } = require('../helpers/draftPay');
const Absences123PayHelper = require('../helpers/123paie/absences');
const Contracts123PayHelper = require('../helpers/123paie/contracts');
const Identification123PayHelper = require('../helpers/123paie/identification');
const Pay123PayHelper = require('../helpers/123paie/pay');
const { createPayList, hoursBalanceDetail, getHoursToWorkBySector } = require('../helpers/pay');
const { IDENTIFICATION, CONTRACT_VERSION, ABSENCE, CONTRACT_END, PAY } = require('../helpers/constants');

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
      case IDENTIFICATION:
        txt = await Identification123PayHelper.exportIdentification(req.query, req.auth.credentials);
        break;
      case CONTRACT_VERSION:
        txt = await Contracts123PayHelper.exportContractVersions(req.query, req.auth.credentials);
        break;
      case ABSENCE:
        txt = await Absences123PayHelper.exportAbsences(req.query, req.auth.credentials);
        break;
      case CONTRACT_END:
        txt = await Contracts123PayHelper.exportContractEnds(req.query, req.auth.credentials);
        break;
      case PAY:
        txt = await Pay123PayHelper.exportPay(req.query, req.auth.credentials);
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
