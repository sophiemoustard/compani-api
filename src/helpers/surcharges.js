const get = require('lodash/get');
const momentRange = require('moment-range');
const moment = require('../extensions/moment');
const Surcharge = require('../models/Surcharge');

momentRange.extendMoment(moment);

exports.list = async credentials => Surcharge.find({ company: get(credentials, 'company._id') }).lean();

exports.create = async (payload, credentials) =>
  Surcharge.create({ ...payload, company: get(credentials, 'company._id') });

exports.update = async (surcharge, payload) => Surcharge.updateOne({ _id: surcharge._id }, { $set: payload });

exports.delete = async surcharge => Surcharge.deleteOne({ _id: surcharge._id });

exports.getCustomSurcharge = (eventStart, eventEnd, surchargeStart, surchargeEnd, percentage, name) => {
  if (!percentage || percentage <= 0) return null;

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
    const firstSurchargeRange = moment.range(moment(eventStart).startOf('d'), formattedEnd);
    const secondSurchargeRange = moment.range(formattedStart, moment(eventStart).endOf('d'));
    const intersectionFirst = eventRange.intersect(firstSurchargeRange);
    const intersectionSecond = eventRange.intersect(secondSurchargeRange);
    console.log(intersectionFirst.end.toDate());

    return [
      ...(intersectionFirst &&
        [{ percentage, name, startHour: intersectionFirst.start.toDate(), endHour: intersectionFirst.end.toDate() }]),
      ...(intersectionSecond &&
        [{ percentage, name, startHour: intersectionSecond.start.toDate(), endHour: intersectionSecond.end.toDate() }]),
    ];
  }
  const surchargeRange = moment.range(formattedStart, formattedEnd);
  const intersection = eventRange.intersect(surchargeRange);

  if (intersection) {
    return [{ percentage, name, startHour: intersection.start.toDate(), endHour: intersection.end.toDate() }];
  }

  return null;
};

const getHourlySurchargeList = (start, end, surcharge) => {
  const { evening, eveningEndTime, eveningStartTime, custom, customStartTime, customEndTime } = surcharge;
  const hourlySurchargeList = [];

  const eveningSurcharge = exports.getCustomSurcharge(start, end, eveningStartTime, eveningEndTime, evening, 'Soirée');
  if (eveningSurcharge) hourlySurchargeList.push(...eveningSurcharge);

  const customSurcharge =
    exports.getCustomSurcharge(start, end, customStartTime, customEndTime, custom, 'Personnalisée');
  if (customSurcharge) hourlySurchargeList.push(...customSurcharge);

  return hourlySurchargeList;
};

// Order matters : we stop to test condition as soon as we found one true
const holidaySurchargeConditionList = [
  { key: 'twentyFifthOfDecember', condition: start => start.format('DD/MM') === '25/12', name: '25 Décembre' },
  { key: 'firstOfMay', condition: start => start.format('DD/MM') === '01/05', name: '1er Mai' },
  { key: 'firstOfJanuary', condition: start => start.format('DD/MM') === '01/01', name: '1er Janvier' },
  { key: 'publicHoliday', condition: start => moment(start).startOf('d').isHoliday(), name: 'Jour férié' },
];

const weekEndSurchargeConditionList = [
  { key: 'saturday', condition: start => start.isoWeekday() === 6, name: 'Samedi' },
  { key: 'sunday', condition: start => start.isoWeekday() === 7, name: 'Dimanche' },
];

const getDailySurcharge = (start, end, surcharge) => {
  const dailySurcharges = [];

  for (const holidaySurchargeCondition of holidaySurchargeConditionList) {
    const { key, name, condition } = holidaySurchargeCondition;
    const percentage = surcharge[key] || 0;
    if (condition(start)) {
      dailySurcharges.push({ percentage, name, startHour: start.toDate(), endHour: end.toDate() });
      continue;
    }
  }

  for (const weekEndSurchargeCondition of weekEndSurchargeConditionList) {
    const { key, name, condition } = weekEndSurchargeCondition;
    const percentage = surcharge[key] || 0;
    if (condition(start)) {
      dailySurcharges.push({ percentage, name, startHour: start.toDate(), endHour: end.toDate() });
      continue;
    }
  }

  return dailySurcharges.sort((a, b) => (a.percentage > b.percentage ? -1 : 1))[0];
};

exports.getEventSurcharges = (event, surcharge) => {
  const start = moment(event.startDate);
  const end = moment(event.endDate);
  const hourlySurchargeList = getHourlySurchargeList(start, end, surcharge);
  const dailySurcharge = getDailySurcharge(start, end, surcharge);

  if (!hourlySurchargeList.length && !dailySurcharge) return [];

  const surchargeList = [dailySurcharge];
  if (dailySurcharge) {
    for (const hourlySurcharge of hourlySurchargeList) {
      if (hourlySurcharge.percentage <= dailySurcharge.percentage) continue;

      const surchargePartToAdd = [];
      for (const [index, dailySurchargePart] of surchargeList.entries()) {
        const hourlySurchargeRange = moment.range(hourlySurcharge.startHour, hourlySurcharge.endHour);
        const dailySurchargeRange = moment.range(dailySurchargePart.startHour, dailySurchargePart.endHour);
        const dailySurchargeIntervalList = dailySurchargeRange.subtract(hourlySurchargeRange);

        if (dailySurchargeIntervalList.length) surchargeList.splice(index, 1);
        for (const dailySurchargeInterval of dailySurchargeIntervalList) {
          surchargePartToAdd.push({
            ...dailySurchargePart,
            startHour: dailySurchargeInterval.start.toDate(),
            endHour: dailySurchargeInterval.end.toDate(),
          });
        }
      }
      surchargeList.push(...surchargePartToAdd);
    }
  }

  surchargeList.push(...hourlySurchargeList);
  console.log(surchargeList);
  return surchargeList;
};
