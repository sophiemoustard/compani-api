const moment = require('../extensions/moment');
const UtilsHelper = require('./utils');
const DatesHelper = require('./dates');

exports.getContractInfo = (versions, query, periodRatio, shouldPayHolidays) => {
  let contractHours = 0;
  let workedDays = 0;
  let holidaysHours = 0;
  const periodDays = periodRatio.businessDays + periodRatio.holidays;
  for (const version of versions) {
    const startDate = moment(version.startDate).isBefore(query.startDate)
      ? moment(query.startDate).toDate()
      : moment(version.startDate).startOf('d').toDate();
    const endDate = version.endDate && moment(version.endDate).isBefore(query.endDate)
      ? moment(version.endDate).endOf('d').toDate()
      : moment(query.endDate).toDate();
    const ratio = UtilsHelper.getDaysRatioBetweenTwoDates(startDate, endDate, shouldPayHolidays);

    const versionDays = ratio.businessDays + ratio.holidays;
    workedDays += versionDays;
    contractHours += version.weeklyHours * (versionDays / periodDays);
    holidaysHours += (version.weeklyHours / 6) * ratio.holidays;
  }

  return { contractHours, holidaysHours, workedDaysRatio: workedDays / periodDays };
};

exports.getMatchingVersionsList = (versions, query) => versions.filter((ver) => {
  const isStartedOnEndDate = moment(ver.startDate).isSameOrBefore(query.endDate);
  const isEndedOnStartDate = ver.endDate && moment(ver.endDate).isSameOrBefore(query.startDate);

  return isStartedOnEndDate && !isEndedOnStartDate;
});

exports.auxiliaryHasActiveContractOnDay = (contracts, day) =>
  exports.auxiliaryHasActiveContractBetweenDates(contracts, day, day);

exports.auxiliaryHasActiveContractBetweenDates = (contracts, startDate, endDate) =>
  contracts.some(c => DatesHelper.isSameOrBefore(c.startDate, startDate) &&
    (!c.endDate || (endDate && DatesHelper.isSameOrAfter(c.endDate, endDate))));
