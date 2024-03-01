const Boom = require('@hapi/boom');
const get = require('lodash/get');
const translate = require('../helpers/translate');
const User = require('../models/User');
const StatsHelper = require('../helpers/stats');

const messages = translate[translate.language];

exports.getCustomerFollowUp = async (req) => {
  try {
    req.log('statController - getCustomerFollowUp - query', req.query);
    req.log('statController - getCustomerFollowUp - company', get(req, 'auth.credentials.company._id'));

    let followUp = await StatsHelper.getCustomerFollowUp(req.query.customer, req.auth.credentials);
    followUp = followUp.filter(user => User.isActive(user));

    return {
      message: followUp.length === 0 ? messages.statsNotFound : messages.statsFound,
      data: { followUp },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.getCustomerFundingsMonitoring = async (req) => {
  try {
    req.log('statController - getCustomerFundingsMonitoring - query', req.query);
    req.log('statController - getCustomerFundingsMonitoring - company', get(req, 'auth.credentials.company._id'));

    const { customer } = req.query;
    const { credentials } = req.auth;
    const customerFundingsMonitoring = await StatsHelper.getCustomerFundingsMonitoring(customer, credentials);

    return {
      message: messages.statsFound,
      data: { customerFundingsMonitoring },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

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

exports.getIntenalAndBilledHoursBySector = async (req) => {
  try {
    req.log('statController - getIntenalAndBilledHoursBySector - query', req.query);
    req.log('statController - getIntenalAndBilledHoursBySector - company', get(req, 'auth.credentials.company._id'));

    const internalAndBilledHours = await StatsHelper.getIntenalAndBilledHoursBySector(req.query, req.auth.credentials);

    return {
      message: messages.statsFound,
      data: { internalAndBilledHours },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};
