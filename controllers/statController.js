const Boom = require('boom');
const translate = require('../helpers/translate');

const User = require('../models/User');
const { getCustomerFollowUp } = require('../repositories/CompanyRepository');

const messages = translate[translate.language];

exports.getCustomerFollowUp = async (req) => {
  try {
    const auxiliaries = await getCustomerFollowUp(req.query.customer);
    if (auxiliaries.length === 0) {
      return {
        message: messages.statsNotFound,
        data: { stats: [] },
      };
    }

    const activeAuxiliaries = auxiliaries.filter(user => User.isActive(user));

    return {
      message: messages.statsFound,
      data: { stats: activeAuxiliaries },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};
