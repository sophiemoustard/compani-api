const Boom = require('boom');

const { getBalances } = require('../helpers/balances');
const translate = require('../helpers/translate');

const { language } = translate;

const list = async (req) => {
  try {
    const balances = await getBalances(req.query.customer, req.query.date, req.auth.credentials);

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

module.exports = {
  list,
};
