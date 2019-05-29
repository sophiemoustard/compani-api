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
    const contractRules = {
      status: COMPANY_CONTRACT,
      $or: [{ endDate: null }, { endDate: { $exists: false } }, { endDate: { $gte: moment(req.query.endDate).endOf('d').toDate() } }]
    };
    const auxiliaries = await Contract.aggregate([
      { $match: { ...contractRules } },
      { $group: { _id: '$user' } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'auxiliary',
        },
      },
      { $unwind: { path: '$auxiliary' } },
      {
        $lookup: {
          from: 'sectors',
          localField: 'auxiliary.sector',
          foreignField: '_id',
          as: 'auxiliary.sector',
        },
      },
      { $unwind: { path: '$auxiliary.sector' } },
      {
        $lookup: {
          from: 'contracts',
          localField: 'auxiliary.contracts',
          foreignField: '_id',
          as: 'auxiliary.contracts',
        },
      },
      {
        $project: {
          _id: 1,
          auxiliary: {
            _id: 1,
            identity: { firstname: 1, lastname: 1 },
            sector: 1,
            contracts: 1,
            contact: 1,
            administrative: { mutualFund: 1, transportInvoice: 1 },
          }
        },
      },
    ]);

    const existingPay = await Pay.find({ month: moment(req.query.startDate).format('MMMM') });

    const draftPay = await getDraftPay(auxiliaries.map(group => group.auxiliary), existingPay, req.query);

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
