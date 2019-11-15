const Boom = require('boom');
const moment = require('moment');

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
  const eventsWithFundingsTwoPreviousMonths = await getFundingMonitoring(req.params._id);
  const careHoursByMonth = {};

  eventsWithFundingsTwoPreviousMonths.forEach((month) => {
    const careHoursByVersion = {};

    month.events.forEach((eventAndFunding) => {
      const { funding, event } = eventAndFunding;
      const versionsForDayOfEvent = funding.versions
        .filter(vers => moment(vers.startDate).isSameOrBefore(moment(event.startDate).endOf('day'))
        && (!vers.endDate || moment(vers.endDate).isSameOrAfter(moment(event.startDate).startOf('day'))))
        .sort((a, b) => moment(a.createdAt).diff(b.createdAt));

      const version = versionsForDayOfEvent.find(vers => vers.careDays.indexOf(moment(event.startDate).day()) > -1);
      if (!version) return;

      if (careHoursByVersion[version._id]) {
        careHoursByVersion[version._id].careHours += moment(event.endDate).diff(event.startDate, 'h', true);
      } else {
        careHoursByVersion[version._id] = {
          careHours: moment(event.endDate).diff(event.startDate, 'h', true),
          possibleCareHours: version.careHours,
        };
      }
    });
    careHoursByMonth[month._id] = careHoursByVersion;
  });
  // return eventsWithFundingsTwoPreviousMonths;
  return careHoursByMonth;
};
