const Boom = require('@hapi/boom');
const get = require('lodash/get');
const translate = require('../helpers/translate');
const StatsHelper = require('../helpers/stats');

const messages = translate[translate.language];

exports.getPaidInterventionStats = async (req) => {
  try {
    req.log('statController - getPaidInterventionStats - query', req.query);
    req.log('statController - getPaidInterventionStats - company', get(req, 'auth.credentials.company._id'));

    const paidInterventionStats = await StatsHelper.getPaidInterventionStats(req.query, req.auth.credentials);

    return {
      message: messages.statsFound,
      data: { paidInterventionStats },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};
