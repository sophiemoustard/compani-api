const moment = require('moment');
const StatRepository = require('../repositories/StatRepository');

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

    const fundingInfo = { thirdPartyPayer: funding.thirdPartyPayer.name };

    for (const month of eventsByMonth) {
      const { date } = month;
      fundingInfo[date] = 0;

      const versions = funding.versions.sort((a, b) => moment(a.createdAt).diff(b.createdAt));
      const version = versions[0];

      const fundingStartDate = versions[versions.length - 1].startDate;
      fundingInfo.plannedCareHours = version.careHours;

      for (const event of month.events) {
        if (version.careDays.indexOf(moment(event.startDate).day()) < 0 || moment(fundingStartDate).isAfter(event.startDate)) continue;
        fundingInfo[date] += moment(event.endDate).diff(event.startDate, 'h', true);
      }
    }
    customerFundingsMonitoring.push(fundingInfo);
  }

  return customerFundingsMonitoring;
};
