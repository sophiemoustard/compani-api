const Boom = require('boom');

const translate = require('../helpers/translate');
const User = require('../models/User');
const { getCustomerFollowUp } = require('../repositories/CompanyRepository');
const { getCustomerFundingsMonitoring, getCustomerAndDurationMonitoring } = require('../helpers/stats');

const messages = translate[translate.language];

exports.getCustomerFollowUp = async (req) => {
  try {
    let followUp = await getCustomerFollowUp(req.query.customer);
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
    const customerFundingsMonitoring = await getCustomerFundingsMonitoring(req.query.customer);

    return {
      message: messages.statsFound,
      data: { customerFundingsMonitoring },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.getCustomerAndDurationMonitoring = async (req) => {
  try {
    const customerAndDurationMonitoring = await getCustomerAndDurationMonitoring(req.query);

    return {
      message: messages.statsFound,
      data: { customerAndDurationMonitoring },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};
