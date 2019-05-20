const Boom = require('boom');
const moment = require('moment');
const translate = require('../helpers/translate');
const { getDraftPay } = require('../helpers/draftPay');
const Contract = require('../models/Contract');
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

    const eventRules = [
      { startDate: { $gte: moment(req.query.startDate).startOf('d').toDate() } },
      { endDate: { $lte: moment(req.query.endDate).endOf('d').toDate() } },
      { auxiliary: { $in: auxiliaries.map(aux => aux._id) } },
    ];
    const draftPay = await getDraftPay(eventRules, req.query);

    return {
      message: translate[language].draftPay,
      data: { draftPay },
    };
  } catch (e) {
    req.log('error', e);
    Boom.badImplementation(e);
  }
};

module.exports = {
  draftPayList,
};
