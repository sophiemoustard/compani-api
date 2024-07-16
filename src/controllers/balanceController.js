const Boom = require('@hapi/boom');
const get = require('lodash/get');

const { getBalances } = require('../helpers/balances');
const translate = require('../helpers/translate');

const { language } = translate;

const list = async (req) => {
  try {
    req.log('balanceController - list - company', get(req, 'auth.credentials.company._id'));

    const balances = await getBalances(req.auth.credentials);

    const filteredBalances = balances.filter(client => client.balance <= -1 || client.balance >= 1);

    return {
      message: translate[language].balancesFound,
      data: { balances: filteredBalances },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { list };
