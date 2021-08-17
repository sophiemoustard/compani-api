const Boom = require('@hapi/boom');

const translate = require('../helpers/translate');
const User = require('../models/User');
const StatsHelper = require('../helpers/stats');

const messages = translate[translate.language];

exports.getCustomerFollowUp = async (req) => {
  try {
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

exports.getAllCustomersFundingsMonitoring = async (req) => {
  try {
    const allCustomersFundingsMonitoring = await StatsHelper.getAllCustomersFundingsMonitoring(req.auth.credentials);

    return {
      message: messages.statsFound,
      data: { allCustomersFundingsMonitoring },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.getPaidInterventionStats = async (req) => {
  try {
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

exports.getCustomersAndDurationBySector = async (req) => {
  try {
    const customersAndDuration = await StatsHelper.getCustomersAndDurationBySector(req.query, req.auth.credentials);

    return {
      message: messages.statsFound,
      data: { customersAndDuration },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.getIntenalAndBilledHoursBySector = async (req) => {
  try {
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
