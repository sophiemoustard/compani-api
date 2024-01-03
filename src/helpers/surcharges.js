const get = require('lodash/get');
const moment = require('../extensions/moment');
const {
  SURCHARGES,
  EVENING,
  CUSTOM,
  TWENTY_FIFTH_OF_DECEMBER,
  FIRST_OF_JANUARY,
  FIRST_OF_MAY,
  PUBLIC_HOLIDAY,
  SATURDAY_LETTER,
  SUNDAY_LETTER,
} = require('./constants');
const Surcharge = require('../models/Surcharge');
const { CompaniDate } = require('./dates/companiDates');

exports.list = async credentials => Surcharge.find({ company: get(credentials, 'company._id') }).lean();

exports.create = async (payload, credentials) =>
  Surcharge.create({ ...payload, company: get(credentials, 'company._id') });

exports.update = async (surcharge, payload) => Surcharge.updateOne({ _id: surcharge._id }, { $set: payload });

exports.delete = async surcharge => Surcharge.deleteOne({ _id: surcharge._id });

exports.getCustomSurcharge = (eventStart, eventEnd, surchargeStart, surchargeEnd, percentage, name) => {
  if (!percentage || percentage <= 0) return [];

  const formattedStart = moment(eventStart)
    .hour(surchargeStart.substring(0, 2))
    .minute(surchargeStart.substring(3))
    .toISOString();
  const formattedEnd = moment(eventStart)
    .hour(surchargeEnd.substring(0, 2))
    .minute(surchargeEnd.substring(3))
    .toISOString();
  const eventRange = moment.range(eventStart, eventEnd);

  if (moment(formattedStart).isAfter(formattedEnd)) {
    const morningSurchargeRange = moment.range(moment(eventStart).startOf('d'), formattedEnd);
    const eveningSurchargeRange = moment.range(formattedStart, moment(eventStart).endOf('d'));
    const morningIntersection = eventRange.intersect(morningSurchargeRange);
    const eveningIntersection = eventRange.intersect(eveningSurchargeRange);

    const intersectionList = [];
    if (morningIntersection) {
      intersectionList.push({
        percentage,
        name,
        startHour: morningIntersection.start.toDate(),
        endHour: morningIntersection.end.toDate(),
      });
    }
    if (eveningIntersection) {
      intersectionList.push({
        percentage,
        name,
        startHour: eveningIntersection.start.toDate(),
        endHour: eveningIntersection.end.toDate(),
      });
    }

    return intersectionList;
  }

  const surchargeRange = moment.range(formattedStart, formattedEnd);
  const intersection = eventRange.intersect(surchargeRange);

  if (intersection) {
    return [{ percentage, name, startHour: intersection.start.toDate(), endHour: intersection.end.toDate() }];
  }

  return [];
};

exports.getHourlySurchargeList = (start, end, surcharge) => {
  const { evening, eveningEndTime, eveningStartTime, custom, customStartTime, customEndTime } = surcharge;
  const eveningSurcharge = exports
    .getCustomSurcharge(start, end, eveningStartTime, eveningEndTime, evening, SURCHARGES[EVENING]);

  const customSurcharge =
    exports.getCustomSurcharge(start, end, customStartTime, customEndTime, custom, SURCHARGES[CUSTOM]);

  return [...eveningSurcharge, ...customSurcharge];
};

// Order matters : we stop to test condition as soon as we found one true
const holidaySurchargeConditionList = [
  {
    key: TWENTY_FIFTH_OF_DECEMBER,
    condition: start => start.format('DD/MM') === '25/12',
    name: SURCHARGES[TWENTY_FIFTH_OF_DECEMBER],
  },
  { key: FIRST_OF_MAY, condition: start => start.format('DD/MM') === '01/05', name: SURCHARGES[FIRST_OF_MAY] },
  { key: FIRST_OF_JANUARY, condition: start => start.format('DD/MM') === '01/01', name: SURCHARGES[FIRST_OF_JANUARY] },
  {
    key: PUBLIC_HOLIDAY,
    condition: start => CompaniDate(start.toISOString()).startOf('day').isHoliday(),
    name: SURCHARGES[PUBLIC_HOLIDAY],
  },
];

const weekEndSurchargeConditionList = [
  { key: SATURDAY_LETTER, condition: start => start.isoWeekday() === 6, name: SURCHARGES[SATURDAY_LETTER] },
  { key: SUNDAY_LETTER, condition: start => start.isoWeekday() === 7, name: SURCHARGES[SUNDAY_LETTER] },
];

exports.getDailySurcharge = (start, end, surcharge) => {
  const dailySurcharges = [];

  for (const holidaySurchargeCondition of holidaySurchargeConditionList) {
    const { key, name, condition } = holidaySurchargeCondition;
    const percentage = surcharge[key] || 0;
    if (condition(start)) {
      dailySurcharges.push({ percentage, name, startHour: start.toDate(), endHour: end.toDate() });
      break;
    }
  }

  for (const weekEndSurchargeCondition of weekEndSurchargeConditionList) {
    const { key, name, condition } = weekEndSurchargeCondition;
    const percentage = surcharge[key] || 0;
    if (condition(start)) {
      dailySurcharges.push({ percentage, name, startHour: start.toDate(), endHour: end.toDate() });
      break;
    }
  }

  return dailySurcharges.sort((a, b) => (a.percentage > b.percentage ? -1 : 1))[0] || null;
};

exports.getEventSurcharges = (event, surcharge) => {
  const start = moment(event.startDate);
  const end = moment(event.endDate);
  const hourlySurchargeList = exports.getHourlySurchargeList(start, end, surcharge);
  const dailySurcharge = exports.getDailySurcharge(start, end, surcharge);

  if (!hourlySurchargeList.length && !dailySurcharge) return [];
  if (!dailySurcharge) return hourlySurchargeList;

  const surchargeList = [dailySurcharge];
  const relevantHourlySurchargeList = [];
  for (const hourlySurcharge of hourlySurchargeList) {
    if (hourlySurcharge.percentage <= dailySurcharge.percentage) continue;

    const dailySurchargePartToAdd = [];
    for (const [index, dailySurchargePart] of surchargeList.entries()) {
      const hourlySurchargeRange = moment.range(hourlySurcharge.startHour, hourlySurcharge.endHour);
      const dailySurchargePartRange = moment.range(dailySurchargePart.startHour, dailySurchargePart.endHour);

      const intersection = dailySurchargePartRange.intersect(hourlySurchargeRange);
      if (!intersection) continue;

      surchargeList.splice(index, 1);
      relevantHourlySurchargeList.push(hourlySurcharge);

      const dailySurchargeIntervalList = dailySurchargePartRange.subtract(hourlySurchargeRange);
      for (const dailySurchargeInterval of dailySurchargeIntervalList) {
        dailySurchargePartToAdd.push({
          ...dailySurchargePart,
          startHour: dailySurchargeInterval.start.toDate(),
          endHour: dailySurchargeInterval.end.toDate(),
        });
      }
    }

    surchargeList.push(...dailySurchargePartToAdd);
  }

  surchargeList.push(...relevantHourlySurchargeList);
  return surchargeList;
};
