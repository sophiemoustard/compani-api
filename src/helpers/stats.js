const moment = require('moment');
const StatRepository = require('../repositories/StatRepository');

const isHoliday = day => moment(day).startOf('d').isHoliday();

const isInCareDays = (careDays, day) => (careDays.includes(moment(day).isoWeekday() - 1) && !isHoliday(day))
  || (careDays.includes(7) && isHoliday(day));

const getMonthCareHours = (events, versionCareDays) => {
  let monthCareHours = 0;
  for (const event of events) {
    if (!isInCareDays(versionCareDays, event.startDate)) continue;
    monthCareHours += moment(event.endDate).diff(event.startDate, 'h', true);
  }
  return monthCareHours;
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
  const splitEventsDate = moment().startOf('month').toDate();
  const eventsGroupedByFundings = await StatRepository.getEventsGroupedByFundings(customerId, fundingsDate, eventsDate, splitEventsDate);
  const customerFundingsMonitoring = [];

  for (const funding of eventsGroupedByFundings) {
    const isPrevMonthRelevant = moment(funding.startDate).isBefore(splitEventsDate);
    customerFundingsMonitoring.push({
      thirdPartyPayer: funding.thirdPartyPayer.name,
      plannedCareHours: funding.careHours,
      prevMonth: isPrevMonthRelevant ? getMonthCareHours(funding.prevMonthEvents, funding.careDays) : -1,
      currentMonth: getMonthCareHours(funding.currentMonthEvents, funding.careDays),
    });
  }

  return customerFundingsMonitoring;
};
