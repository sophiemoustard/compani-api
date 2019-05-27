const Boom = require('boom');
const differenceBy = require('lodash/differenceBy');
const moment = require('moment');
const translate = require('../helpers/translate');
const { getDraftPay } = require('../helpers/draftPay');
const Contract = require('../models/Contract');
const Pay = require('../models/Pay');
const { COMPANY_CONTRACT } = require('../helpers/constants');

const { language } = translate;

const draftPayList = async (req) => {
  try {
    const contractRules = [
      { status: COMPANY_CONTRACT },
      { $or: [{ endDate: null }, { endDate: { $exists: false } }] },
    ];
    const auxiliaries = await Contract.aggregate([
      { $match: { $and: contractRules } },
      { $group: { _id: '$user' } },
      { $project: { _id: 1 } },
    ]);
    const alreadyPaidAuxiliaries = await Pay.aggregate([
      { $match: { month: moment(req.query.startDate).format('MMMM') } },
      { $project: { auxiliary: 1 } },
    ]);

    const draftPay = await getDraftPay(
      differenceBy(auxiliaries.map(aux => aux._id), alreadyPaidAuxiliaries.map(aux => aux.auxiliary), x => x.toHexString()),
      req.query
    );

    return {
      message: translate[language].draftPay,
      data: { draftPay },
    };
  } catch (e) {
    req.log('error', e);
    Boom.badImplementation(e);
  }
};

const createList = (req) => {
  try {
    const promises = [];
    for (const pay of req.payload) {
      promises.push((new Pay({
        ...pay,
        ...(pay.surchargedAndNotExemptDetails && { surchargedAndNotExemptDetails: JSON.stringify(pay.surchargedAndNotExemptDetails) }),
        ...(pay.surchargedAndExemptDetails && { surchargedAndExemptDetails: JSON.stringify(pay.surchargedAndExemptDetails) }),
      })).save());
    }

    Promise.resolve(promises);

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
