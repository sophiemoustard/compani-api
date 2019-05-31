const Boom = require('boom');
const translate = require('../helpers/translate');
const { getDraftPay } = require('../helpers/draftPay');
const Pay = require('../models/Pay');

const { language } = translate;

const draftPayList = async (req) => {
  try {
    const draftPay = await getDraftPay(req.query);

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
    const promises = [];
    for (const pay of req.payload) {
      promises.push((new Pay({
        ...pay,
        ...(pay.surchargedAndNotExemptDetails && { surchargedAndNotExemptDetails: JSON.stringify(pay.surchargedAndNotExemptDetails) }),
        ...(pay.surchargedAndExemptDetails && { surchargedAndExemptDetails: JSON.stringify(pay.surchargedAndExemptDetails) }),
      })).save());
    }

    await Promise.all(promises);

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
