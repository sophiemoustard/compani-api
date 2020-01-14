const { ObjectID } = require('mongodb');
const get = require('lodash/get');
const pick = require('lodash/pick');
const moment = require('../extensions/moment');
const StatRepository = require('../repositories/StatRepository');
const EventRepository = require('../repositories/EventRepository');
const SectorHistoriesHelper = require('../helpers/sectorHistories');

const isHoliday = day => moment(day).startOf('d').isHoliday();

const isInCareDays = (careDays, day) => (careDays.includes(moment(day).isoWeekday() - 1) && !isHoliday(day))
  || (careDays.includes(7) && isHoliday(day));

const isNotStarted = (eventStartDate, fundingStartDate) => moment(fundingStartDate).isAfter(eventStartDate);

const isEnded = (eventStartDate, fundingEndDate) => fundingEndDate && moment(fundingEndDate).isBefore(eventStartDate);

const getMonthCareHours = (events, funding) => {
  let monthCareHours = 0;
  for (const event of events) {
    if (!isInCareDays(funding.careDays, event.startDate) || isNotStarted(event.startDate, funding.startDate)
      || isEnded(event.startDate, funding.endDate)) continue;
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

exports.getCustomersAndDurationByAuxiliary = async (query, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  if (query.sector) {
    const sectors = Array.isArray(query.sector)
      ? query.sector.map(id => new ObjectID(id))
      : [new ObjectID(query.sector)];
    const auxiliariesBySectors = await SectorHistoriesHelper.getUsersBySectors(query.month, sectors, companyId);
    const result = [];
    for (const auxiliariesBySector of auxiliariesBySectors) {
      result.push({
        _id: auxiliariesBySector._id,
        auxiliaries: await EventRepository.getCustomersAndDurationByAuxiliary(
          auxiliariesBySector.auxiliaries.map(aux => aux._id),
          query.month,
          companyId
        ),
      });
    }
    return result;
  }
  return EventRepository.getCustomersAndDurationByAuxiliary([new ObjectID(query.auxiliary)], query.month, companyId);
};

exports.getCustomersAndDurationBySector = async (query, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const sectors = Array.isArray(query.sector)
    ? query.sector.map(id => new ObjectID(id))
    : [new ObjectID(query.sector)];

  return StatRepository.getCustomersAndDurationBySector(sectors, query.month, companyId);
};
