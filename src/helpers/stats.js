const { ObjectID } = require('mongodb');
const get = require('lodash/get');
const pick = require('lodash/pick');
const moment = require('../extensions/moment');
const UtilsHelper = require('./utils');
const StatRepository = require('../repositories/StatRepository');
const SectorHistoryRepository = require('../repositories/SectorHistoryRepository');

const isHoliday = day => moment(day).startOf('d').isHoliday();

const isInCareDays = (careDays, day) => (careDays.includes(moment(day).isoWeekday() - 1) && !isHoliday(day)) ||
  (careDays.includes(7) && isHoliday(day));

const isNotStarted = (eventStartDate, fundingStartDate) => moment(fundingStartDate).isAfter(eventStartDate);

const isEnded = (eventStartDate, fundingEndDate) => fundingEndDate && moment(fundingEndDate).isBefore(eventStartDate);

const getMonthCareHours = (events, funding) => {
  let monthCareHours = 0;
  for (const event of events) {
    if (!isInCareDays(funding.careDays, event.startDate) || isNotStarted(event.startDate, funding.startDate) ||
      isEnded(event.startDate, funding.endDate)) continue;
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
      prevMonthCareHours: isPrevMonthRelevant ? getMonthCareHours(funding.prevMonthEvents, funding) : -1,
      currentMonthCareHours: getMonthCareHours(funding.currentMonthEvents, funding),
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
      prevMonthCareHours: isPrevMonthRelevant ? getMonthCareHours(funding.prevMonthEvents, funding) : -1,
      currentMonthCareHours: getMonthCareHours(funding.currentMonthEvents, funding),
      nextMonthCareHours: isNextMonthRelevant ? getMonthCareHours(funding.nextMonthEvents, funding) : -1,
    });
  }

  return allCustomersFundingsMonitoring;
};

exports.getPaidInterventionStats = async (query, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  if (query.sector) {
    const sectors = UtilsHelper.formatObjectIdsArray(query.sector);
    const startOfMonth = moment(query.month, 'MMYYYY').startOf('M').toDate();
    const endOfMonth = moment(query.month, 'MMYYYY').endOf('M').toDate();
    const auxiliariesFromSectorHistories = await SectorHistoryRepository.getUsersFromSectorHistories(
      startOfMonth,
      endOfMonth,
      sectors,
      companyId
    );
    return SectorHistoryRepository.getPaidInterventionStats(
      auxiliariesFromSectorHistories.map(aux => aux.auxiliaryId),
      query.month,
      companyId
    );
  }
  return SectorHistoryRepository.getPaidInterventionStats([new ObjectID(query.auxiliary)], query.month, companyId);
};

exports.getCustomersAndDurationBySector = async (query, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const sectors = UtilsHelper.formatObjectIdsArray(query.sector);

  return StatRepository.getCustomersAndDurationBySector(sectors, query.month, companyId);
};

exports.getIntenalAndBilledHoursBySector = async (query, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const sectors = UtilsHelper.formatObjectIdsArray(query.sector);

  return StatRepository.getIntenalAndBilledHoursBySector(sectors, query.month, companyId);
};
