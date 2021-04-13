const Boom = require('@hapi/boom');

const { getBalances, getBalancesWithDetails } = require('../helpers/balances');
const translate = require('../helpers/translate');

const { language } = translate;

const list = async (req) => {
  try {
    const balances = await getBalances(req.auth.credentials);

    const filteredBalances = balances.filter(client => client.balance < -1 || client.balance > 1);

    return {
      message: translate[language].balancesFound,
      data: { balances: filteredBalances },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const listWithDetails = async (req) => {
  try {
    const balancesWithDetails = await getBalancesWithDetails(req.query, req.auth.credentials);

    return {
      message: translate[language].balancesFound,
      data: balancesWithDetails,
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { list, listWithDetails };
