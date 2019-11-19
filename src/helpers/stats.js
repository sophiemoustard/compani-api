const moment = require('moment');

exports.getStatsOnCareHours = (eventsGroupedByFundings) => {
  const statsOnCareHours = [];

  eventsGroupedByFundings.forEach((fundingAndEvents) => {
    const funding = fundingAndEvents._id;
    const { eventsByMonth } = fundingAndEvents;

    const fundingInfo = {
      thirdPartyPayer: funding.thirdPartyPayer.name,
    };

    eventsByMonth.forEach((month) => {
      const { date } = month;
      fundingInfo[date] = 0;

      const versions = funding.versions.sort((a, b) => moment(a.createdAt).diff(b.createdAt));
      const version = versions[0];
      fundingInfo.plannedCareHours = version.careHours;

      month.events.forEach((event) => {
        if (version.careDays.indexOf(moment(event.startDate).day()) < 0) return;
        fundingInfo[date] += moment(event.endDate).diff(event.startDate, 'h', true);
      });
    });
    statsOnCareHours.push(fundingInfo);
  });

  return statsOnCareHours;
};
