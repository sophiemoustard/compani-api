const Boom = require('boom');

const translate = require('../helpers/translate');
const User = require('../models/User');
const { getCustomerFollowUp } = require('../repositories/CompanyRepository');
const StatsHelper = require('../helpers/stats');

const messages = translate[translate.language];

exports.getCustomerFollowUp = async (req) => {
  try {
    let followUp = await getCustomerFollowUp(req.query.customer, req.auth.credentials);
    if (followUp.length === 0) {
      return {
        message: messages.statsNotFound,
        data: { stats: [] },
      };
    }

    followUp = followUp.filter(user => User.isActive(user));

    return {
      message: messages.statsFound,
      data: { stats: followUp },
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

exports.getCustomersAndDurationByAuxiliary = async (req) => {
  try {
    const customerAndDuration = await StatsHelper.getCustomersAndDurationByAuxiliary(req.query, req.auth.credentials);

    return {
      message: messages.statsFound,
      data: { customerAndDuration },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.getCustomersAndDurationBySector = async (req) => {
  try {
    const customerAndDuration = await StatsHelper.getCustomersAndDurationBySector(req.query, req.auth.credentials);

    return {
      message: messages.statsFound,
      data: { customerAndDuration },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};
