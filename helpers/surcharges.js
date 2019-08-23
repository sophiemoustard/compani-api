const moment = require('../extensions/moment');

exports.getCustomSurcharge = (eventStart, eventEnd, surchargeStart, surchargeEnd, percentage) => {
  if (!percentage || percentage <= 0) return null;

  surchargeStart = moment(eventStart).hour(surchargeStart.substring(0, 2)).minute(surchargeStart.substring(3));
  surchargeEnd = moment(eventStart).hour(surchargeEnd.substring(0, 2)).minute(surchargeEnd.substring(3));
  if (surchargeStart.isAfter(surchargeEnd)) surchargeEnd = surchargeEnd.add(1, 'd');

  const eventRange = moment.range(eventStart, eventEnd);
  const surchargeRange = moment.range(surchargeStart, surchargeEnd);

  const intersection = eventRange.intersect(surchargeRange);
  if (!intersection) return null;

  return {
    percentage,
    startHour: intersection.start.toDate(),
    endHour: intersection.end.toDate(),
  };
};

const surchargeConditions = [
  { key: 'twentyFifthOfDecember', condition: start => start.format('DD/MM') === '25/12' },
  { key: 'firstOfMay', condition: start => start.format('DD/MM') === '01/05' },
  { key: 'publicHoliday', condition: start => moment(start).startOf('d').isHoliday() },
  { key: 'saturday', condition: start => start.isoWeekday() === 6 },
  { key: 'sunday', condition: start => start.isoWeekday() === 7 },
];

exports.getEventSurcharges = (event, surcharge) => {
  const start = moment(event.startDate);

  for (const surchargeCondition of surchargeConditions) {
    const percentage = surcharge[surchargeCondition.key];
    if (percentage && percentage > 0 && surchargeCondition.condition(start)) {
      return [{ percentage }];
    }
  }

  const {
    evening, eveningEndTime, eveningStartTime,
    custom, customStartTime, customEndTime,
  } = surcharge;
  const end = moment(event.endDate);
  const surcharges = [];
  const eveningSurcharge = exports.getCustomSurcharge(start, end, eveningStartTime, eveningEndTime, evening);
  if (eveningSurcharge) surcharges.push(eveningSurcharge);
  const customSurcharge = exports.getCustomSurcharge(start, end, customStartTime, customEndTime, custom);
  if (customSurcharge) surcharges.push(customSurcharge);

  return surcharges;
};
