const Boom = require('@hapi/boom');
const get = require('lodash/get');
const translate = require('../helpers/translate');
const PayHelper = require('../helpers/pay');

const { language } = translate;

const getHoursBalanceDetails = async (req) => {
  try {
    req.log('payController - getHoursBalanceDetails - query', req.query);
    req.log('payController - getHoursBalanceDetails - company', get(req, 'auth.credentials.company._id'));

    const { query, auth } = req;
    const detail = await PayHelper.hoursBalanceDetail(query, auth.credentials);
    return {
      message: translate[language].hoursBalanceDetail,
      data: { hoursBalanceDetail: detail },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = {
  getHoursBalanceDetails,
};
