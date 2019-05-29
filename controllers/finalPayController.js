const Boom = require('boom');
const moment = require('moment');
const differenceBy = require('lodash/differenceBy');
const translate = require('../helpers/translate');
const { getDraftFinalPay } = require('../helpers/draftFinalPay');
const Contract = require('../models/Contract');
const { COMPANY_CONTRACT } = require('../helpers/constants');
const FinalPay = require('../models/FinalPay');

const { language } = translate;

const draftFinalPayList = async (req) => {
  try {
    const contracts = await Contract.aggregate([
      {
        $match: {
          status: COMPANY_CONTRACT,
          endDate: { $exists: true, $lte: moment(req.query.endDate).endOf('d').toDate(), $gte: moment(req.query.startDate).endOf('d').toDate() }
        }
      },
    ]);
    const existingFinalPay = await FinalPay.find({ month: moment(req.query.startDate).format('MMMM') });

    const finalPayAuxiliaries = differenceBy(contracts.map(con => con.user), existingFinalPay.map(fp => fp.auxiliary), x => x.toHexString());
    const draftFinalPay = await getDraftFinalPay(finalPayAuxiliaries, req.query);

    return {
      message: translate[language].draftFinalPay,
      data: { draftFinalPay },
    };
  } catch (e) {
    req.log('error', e);
    Boom.badImplementation(e);
  }
};

const createList = async (req) => {
  try {
    const finalPayList = [];
    for (const finalPay of req.payload) {
      finalPayList.push((new FinalPay({
        ...finalPay,
        ...(finalPay.surchargedAndNotExemptDetails && { surchargedAndNotExemptDetails: JSON.stringify(finalPay.surchargedAndNotExemptDetails) }),
        ...(finalPay.surchargedAndExemptDetails && { surchargedAndExemptDetails: JSON.stringify(finalPay.surchargedAndExemptDetails) }),
      })));
    }

    await FinalPay.insertMany(finalPayList);

    return { message: translate[language].finalPayListCreated };
  } catch (e) {
    req.log('error', e);
    Boom.badImplementation(e);
  }
};

module.exports = {
  draftFinalPayList,
  createList
};
