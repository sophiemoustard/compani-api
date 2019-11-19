const Boom = require('boom');
const moment = require('moment');

const translate = require('../helpers/translate');
const User = require('../models/User');
const { getCustomerFollowUp } = require('../repositories/CompanyRepository');
const { getEventsGroupedByFundings } = require('../repositories/StatRepository');
const { getStatsOnCareHours } = require('../helpers/stats');

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

exports.getFundingsMonitoring = async (req) => {
  try {
    const eventsGroupedByFundings = await getEventsGroupedByFundings(
      req.params._id,
      moment().endOf('month').toDate(),
      moment().startOf('month').toDate(),
      moment()
        .subtract(2, 'month')
        .endOf('month')
        .endOf('day')
        .toDate(),
      moment().endOf('month').toDate()
    );

    const statsOnCareHours = getStatsOnCareHours(eventsGroupedByFundings);

    return {
      message: messages.statsFound,
      data: { stats: statsOnCareHours },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};
