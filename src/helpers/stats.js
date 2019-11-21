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

    const versions = funding.versions.sort((a, b) => moment(a.createdAt).diff(b.createdAt));
    const version = versions[0];

    const fundingStartDate = versions[versions.length - 1].startDate;
    fundingInfo.plannedCareHours = version.careHours;

    if (!eventsByMonth[0].date) {
      fundingInfo[moment().format('YYYY-MM')] = 0;
      fundingInfo[moment().subtract(1, 'month').format('YYYY-MM')] = moment(fundingStartDate).isBefore(moment().subtract(1, 'month').endOf('month'))
        ? 0
        : -1;
    } else {
      for (const month of eventsByMonth) {
        const { date } = month;
        fundingInfo[date] = 0;

        for (const event of month.events) {
          if (version.careDays.indexOf(moment(event.startDate).day()) < 0) continue;
          if (moment(fundingStartDate).isAfter(event.startDate)) fundingInfo[date] = -1;
          else fundingInfo[date] += moment(event.endDate).diff(event.startDate, 'h', true);
        }
      }
    }
    customerFundingsMonitoring.push(fundingInfo);
  }

  return customerFundingsMonitoring;
};
