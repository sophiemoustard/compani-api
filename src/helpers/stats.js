const { ObjectID } = require('mongodb');
const get = require('lodash/get');
const pick = require('lodash/pick');
const moment = require('../extensions/moment');
const StatRepository = require('../repositories/StatRepository');

const isHoliday = day => moment(day).startOf('d').isHoliday();

const isInCareDays = (careDays, day) => (careDays.includes(moment(day).isoWeekday() - 1) && !isHoliday(day))
  || (careDays.includes(7) && isHoliday(day));

const hasNotBegun = (eventStartDate, fundingStartDate) => moment(fundingStartDate).isAfter(eventStartDate);

const hasEnded = (eventStartDate, fundingEndDate) => fundingEndDate && moment(fundingEndDate).isBefore(eventStartDate);

const getMonthCareHours = (events, versionCareDays, fundingStartDate, fundingEndDate) => {
  let monthCareHours = 0;
  for (const event of events) {
    if (!isInCareDays(versionCareDays, event.startDate) || hasNotBegun(event.startDate, fundingStartDate)
      || hasEnded(event.startDate, fundingEndDate)) continue;
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
    minDate: moment().subtract(1, 'month').startOf('month').toDate(),
    maxDate: moment().endOf('month').toDate(),
  };
  const eventsGroupedByFundings = await StatRepository.getEventsGroupedByFundings(
    customerId,
    fundingsDate,
    eventsDate,
    get(credentials, 'company._id', null)
  );
  const customerFundingsMonitoring = [];

  for (const funding of eventsGroupedByFundings) {
    const isPrevMonthRelevant = moment(funding.startDate).isBefore(moment().startOf('month').toDate());
    customerFundingsMonitoring.push({
      thirdPartyPayer: funding.thirdPartyPayer.name,
      careHours: funding.careHours,
      prevMonthCareHours: isPrevMonthRelevant ? getMonthCareHours(funding.prevMonthEvents, funding.careDays) : -1,
      currentMonthCareHours: getMonthCareHours(funding.currentMonthEvents, funding.careDays),
    });
  }

  return customerFundingsMonitoring;
};

exports.getAllCustomersFundingsMonitoring = async (credentials) => {
  const fundingsDate = {
    maxStartDate: moment().endOf('month').toDate(),
    minEndDate: moment().startOf('month').toDate(),
  };
  const eventsDate = {
    minDate: moment().subtract(1, 'month').startOf('month').toDate(),
    maxDate: moment().add(1, 'month').endOf('month').toDate(),
  };
  const eventsGroupedByFundingsforAllCustomers = await StatRepository.getEventsGroupedByFundingsforAllCustomers(
    fundingsDate,
    eventsDate,
    get(credentials, 'company._id', null)
  );
  const allCustomersFundingsMonitoring = [];
  for (const funding of eventsGroupedByFundingsforAllCustomers) {
    const isPrevMonthRelevant = moment(funding.startDate).isBefore(moment().startOf('month').toDate());
    const isNextMonthRelevant = !funding.endDate || moment(funding.endDate).isAfter(moment().endOf('month').toDate());

    allCustomersFundingsMonitoring.push({
      ...pick(funding, ['sector', 'customer', 'referent', 'unitTTCRate', 'customerParticipationRate']),
      careHours: funding.careHours,
      tpp: funding.thirdPartyPayer,
      prevMonthCareHours: isPrevMonthRelevant
        ? getMonthCareHours(funding.prevMonthEvents, funding.careDays, funding.startDate, funding.endDate)
        : -1,
      currentMonthCareHours: getMonthCareHours(funding.currentMonthEvents, funding.careDays, funding.startDate, funding.endDate),
      nextMonthCareHours: isNextMonthRelevant
        ? getMonthCareHours(funding.nextMonthEvents, funding.careDays, funding.startDate, funding.endDate)
        : -1,
    });
  }

  return allCustomersFundingsMonitoring;
};

exports.getCustomersAndDurationBySector = async (query, credentials) => {
  const sectors = Array.isArray(query.sector) ? query.sector.map(id => new ObjectID(id)) : [new ObjectID(query.sector)];

  return StatRepository.getCustomersAndDurationBySector(sectors, query.month, get(credentials, 'company._id', null));
};
