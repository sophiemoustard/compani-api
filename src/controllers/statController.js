const Boom = require('boom');
const translate = require('../helpers/translate');

const User = require('../models/User');
const { getCustomerFollowUp } = require('../repositories/CompanyRepository');
const { getFundingMonitoring } = require('../repositories/StatRepository');

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

exports.getFundingMonitoring = async (req) => {
  const res = getFundingMonitoring(req.params._id);
  return res;
};
