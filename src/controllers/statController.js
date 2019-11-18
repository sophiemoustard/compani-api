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

    eventsWithFundingsTwoPreviousMonths.forEach((fundingAndEvents) => {
      const funding = fundingAndEvents._id;
      const { eventsByMonth } = fundingAndEvents;

      const fundingInfo = { service: funding.service.versions[0].name, funding: funding.thirdPartyPayer.name };

      eventsByMonth.forEach((month) => {
        const { date } = month;
        fundingInfo[date] = 0;
        const endOfMonth = moment(date).endOf('month').toDate();
        const beginningOfMonth = moment(date).startOf('month').toDate();

        const possibleVersionsForMonth = funding.versions
          .filter(vers => moment(vers.startDate).isSameOrBefore(endOfMonth)
            && (!vers.endDate || moment(vers.endDate).isSameOrAfter(beginningOfMonth)))
          .sort((a, b) => moment(a.createdAt).diff(b.createdAt));

        if (!possibleVersionsForMonth.length) return;
        const version = possibleVersionsForMonth[funding.versions.length - 1];
        fundingInfo.possibleCareHours = version.careHours;

        month.events.forEach((event) => {
          if (version.careDays.indexOf(moment(event.startDate).day()) < 0) return;
          fundingInfo[date] += moment(event.endDate).diff(event.startDate, 'h', true);
        });
      });
      careHours.push(fundingInfo);
    });

    return careHours;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};
