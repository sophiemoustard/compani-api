const Boom = require('boom');
const moment = require('moment');
const differenceBy = require('lodash/differenceBy');
const translate = require('../helpers/translate');
const { getDraftStc } = require('../helpers/draftStc');
const Contract = require('../models/Contract');
const { COMPANY_CONTRACT } = require('../helpers/constants');
const Stc = require('../models/Stc');

const { language } = translate;

const draftStcList = async (req) => {
  try {
    const contracts = await Contract.find({
      status: COMPANY_CONTRACT,
      endDate: { $exists: true, $lte: moment(req.query.endDate).endOf('d').toDate(), $gte: moment(req.query.startDate).endOf('d').toDate() }
    });
    const existingStc = await Stc.find({ month: moment(req.query.startDate).format('MMMM') });

    const finalPayAuxiliaries = differenceBy(contracts.map(con => con.user), existingStc.map(stc => stc.auxiliary), x => x.toHexString());
    const draftStc = await getDraftStc(finalPayAuxiliaries, req.query);

    return {
      message: translate[language].draftStc,
      data: { draftStc },
    };
  } catch (e) {
    req.log('error', e);
    Boom.badImplementation(e);
  }
};

const createList = async (req) => {
  try {
    const promises = [];
    for (const stc of req.payload) {
      promises.push((new Stc({
        ...stc,
        ...(stc.surchargedAndNotExemptDetails && { surchargedAndNotExemptDetails: JSON.stringify(stc.surchargedAndNotExemptDetails) }),
        ...(stc.surchargedAndExemptDetails && { surchargedAndExemptDetails: JSON.stringify(stc.surchargedAndExemptDetails) }),
      })).save());
    }

    await Promise.all(promises);

    return { message: translate[language].stcListCreated };
  } catch (e) {
    req.log('error', e);
    Boom.badImplementation(e);
  }
};

module.exports = {
  draftStcList,
  createList
};
