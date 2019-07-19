const Boom = require('boom');
const translate = require('../helpers/translate');
const { getDraftFinalPay } = require('../helpers/draftFinalPay');
const FinalPay = require('../models/FinalPay');

const { language } = translate;

const draftFinalPayList = async (req) => {
  try {
    const draftFinalPay = await getDraftFinalPay(req.query);

    return {
      message: translate[language].draftFinalPay,
      data: { draftFinalPay },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const createList = async (req) => {
  try {
    const finalPayList = [];
    for (const finalPay of req.payload) {
      finalPayList.push((new FinalPay({
        ...finalPay,
        ...(finalPay.surchargedAndNotExemptDetails && { surchargedAndNotExemptDetails: Object.values(finalPay.surchargedAndNotExemptDetails) }),
        ...(finalPay.surchargedAndExemptDetails && { surchargedAndExemptDetails: Object.values(finalPay.surchargedAndExemptDetails) }),
      })));
    }

    await FinalPay.insertMany(finalPayList);

    return { message: translate[language].finalPayListCreated };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

module.exports = {
  draftFinalPayList,
  createList
};
