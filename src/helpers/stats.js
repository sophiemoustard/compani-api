const moment = require('moment');
const StatRepository = require('../repositories/StatRepository');

const isHoliday = day => moment(day).startOf('d').isHoliday();

const isInCareDays = (careDays, day) => (careDays.includes(moment(day).isoWeekday() - 1) && !isHoliday(day))
  || (careDays.includes(7) && isHoliday(day));

const isBeforeFundingStartingDate = (fundingStartDate, date) => moment(fundingStartDate).isAfter(date);

const getMonthCareHours = (events, versionCareDays, fundingStartDate) => {
  let monthCareHours = 0;
  for (const event of events) {
    if (!isInCareDays(versionCareDays, event.startDate)
      || isBeforeFundingStartingDate(fundingStartDate, event.startDate)) continue;
    else monthCareHours += moment(event.endDate).diff(event.startDate, 'h', true);
  }
  return monthCareHours;
};

const getFundingInfo = (funding, eventsByMonth) => {
  const versions = funding.versions.sort((a, b) => moment(a.createdAt).diff(b.createdAt));
  const version = versions[0];
  const fundingStartDate = versions[versions.length - 1].startDate;

  const fundingInfo = { thirdPartyPayer: funding.thirdPartyPayer.name };
  fundingInfo.plannedCareHours = version.careHours;
  const previousMonth = moment().subtract(1, 'month');

  if (!eventsByMonth[0].date) {
    fundingInfo[moment().format('YYYY-MM')] = 0;
    fundingInfo[previousMonth.format('YYYY-MM')] = isBeforeFundingStartingDate(fundingStartDate, previousMonth.endOf('month'))
      ? -1
      : 0;
  } else if (eventsByMonth.length === 1) {
    fundingInfo[eventsByMonth[0].date] = getMonthCareHours(eventsByMonth[0].events, version.careDays, fundingStartDate);
    const otherMonth = eventsByMonth[0].date === moment().format('YYYY-MM')
      ? previousMonth.endOf('month')
      : moment().endOf('month');
    fundingInfo[otherMonth.format('YYYY-MM')] = isBeforeFundingStartingDate(fundingStartDate, otherMonth) ? -1 : 0;
  } else {
    for (const month of eventsByMonth) {
      const { date } = month;
      if (isBeforeFundingStartingDate(fundingStartDate, moment(date).endOf('month'))) fundingInfo[date] = -1;
      else fundingInfo[date] = getMonthCareHours(month.events, version.careDays, fundingStartDate);
    }
  }
  return fundingInfo;
};

exports.getCustomerFundingsMonitoring = async (customerId) => {
  const fundingsDate = {
    maxStartDate: moment().endOf('month').toDate(),
    minEndDate: moment().startOf('month').toDate(),
  };
  const eventsDate = {
    minStartDate: moment().subtract(2, 'month').endOf('month').toDate(),
    maxStartDate: moment().endOf('month').toDate(),
  };
  const eventsGroupedByFundings = await StatRepository.getEventsGroupedByFundings(customerId, fundingsDate, eventsDate);
  const customerFundingsMonitoring = [];

  for (const fundingAndEvents of eventsGroupedByFundings) {
    const funding = fundingAndEvents._id;
    const { eventsByMonth } = fundingAndEvents;

    customerFundingsMonitoring.push(getFundingInfo(funding, eventsByMonth));
  }

  return customerFundingsMonitoring;
};
