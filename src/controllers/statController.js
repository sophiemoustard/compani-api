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
  try {
    const eventsWithFundingsTwoPreviousMonths = await getFundingMonitoring(req.params._id);
    const careHours = [];

    eventsWithFundingsTwoPreviousMonths.forEach((fundingAndMonth) => {
      const { funding } = fundingAndMonth._id;
      const fundingInfo = { funding: funding.thirdPartyPayer[0].name };

      fundingAndMonth.events.forEach((event) => {
        const prevOrCurrentMonth = moment().month() === moment(event.startDate).month() ? 'currentMonth' : 'prevMonth';

        const versionsForDayOfEvent = funding.versions
          .filter(vers => moment(vers.startDate).isSameOrBefore(moment(event.startDate).endOf('day'))
          && (!vers.endDate || moment(vers.endDate).isSameOrAfter(moment(event.startDate).startOf('day'))))
          .sort((a, b) => moment(a.createdAt).diff(b.createdAt));

        const version = versionsForDayOfEvent.find(vers => vers.careDays.indexOf(moment(event.startDate).day()) > -1);
        if (!version) return;
        fundingInfo.possibleCareHours = version.careHours;
        if (!fundingInfo[prevOrCurrentMonth]) fundingInfo[prevOrCurrentMonth] = 0;

        fundingInfo[prevOrCurrentMonth] += moment(event.endDate).diff(event.startDate, 'h', true);
      });
      careHours.push(fundingInfo);
    });

    return careHours;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};
