const Boom = require('boom');
const moment = require('moment');
const translate = require('../helpers/translate');
const { getDraftStc } = require('../helpers/draftStc');
const Contract = require('../models/Contract');
const { COMPANY_CONTRACT } = require('../helpers/constants');

const { language } = translate;

const getDraftStcList = async (req) => {
  try {
    const contractRules = [
      { status: COMPANY_CONTRACT },
      { endDate: { $exists: true, $lte: moment(req.endDate).endOf('d').toDate() } },
    ];

    const auxiliaries = await Contract.aggregate([
      { $match: { $and: contractRules } },
      { $group: { _id: '$user' } },
      { $project: { _id: 1 } },
    ]);
    // TODO : add existing STC

    const draftStc = await getDraftStc(auxiliaries.map(aux => aux._id), req.query);

    return {
      message: translate[language].draftStc,
      data: { draftStc },
    };
  } catch (e) {
    req.log('error', e);
    Boom.badImplementation(e);
  }
};

module.exports = {
  getDraftStcList,
};
