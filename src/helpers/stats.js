const { ObjectID } = require('mongodb');
const get = require('lodash/get');
const moment = require('../extensions/moment');
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

exports.getCustomerFundingsMonitoring = async (customerId, credentials) => {
  const fundingsDate = {
    maxStartDate: moment().endOf('month').toDate(),
    minEndDate: moment().startOf('month').toDate(),
  };
  const eventsDate = {
    minStartDate: moment().subtract(2, 'month').endOf('month').toDate(),
    maxStartDate: moment().endOf('month').toDate(),
  };
  const startOfCurrentMonth = moment().startOf('month').toDate();
  const eventsGroupedByFundings = await StatRepository.getEventsGroupedByFundings(
    customerId,
    fundingsDate,
    eventsDate,
    startOfCurrentMonth,
    get(credentials, 'company._id', null)
  );
  const customerFundingsMonitoring = [];

  for (const funding of eventsGroupedByFundings) {
    const isPrevMonthRelevant = moment(funding.startDate).isBefore(startOfCurrentMonth);
    customerFundingsMonitoring.push({
      thirdPartyPayer: funding.thirdPartyPayer.name,
      plannedCareHours: funding.careHours,
      prevMonthCareHours: isPrevMonthRelevant ? getMonthCareHours(funding.prevMonthEvents, funding.careDays) : -1,
      currentMonthCareHours: getMonthCareHours(funding.currentMonthEvents, funding.careDays),
    });
  }

  return customerFundingsMonitoring;
};

exports.getCustomersAndDurationBySector = async (query, credentials) => {
  const sectors = Array.isArray(query.sector) ? query.sector.map(id => new ObjectID(id)) : [new ObjectID(query.sector)];

  return StatRepository.getCustomersAndDurationBySector(sectors, query.month, get(credentials, 'company._id', null));
};
