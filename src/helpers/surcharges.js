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

exports.getCustomSurcharge = (eventStart, eventEnd, surchargeStart, surchargeEnd, percentage) => {
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

  let intersection;
  if (moment(formattedStart).isAfter(formattedEnd)) {
    const firstSurchargeRange = moment.range(moment(eventStart).startOf('d'), formattedEnd);
    const secondSurchargeRange = moment.range(formattedStart, moment(eventStart).endOf('d'));

    intersection = eventRange.intersect(firstSurchargeRange) || eventRange.intersect(secondSurchargeRange);
  } else {
    const surchargeRange = moment.range(formattedStart, formattedEnd);
    intersection = eventRange.intersect(surchargeRange);
  }

  if (!intersection) return null;

  return {
    percentage,
    startHour: intersection.start.toDate(),
    endHour: intersection.end.toDate(),
  };
};

const surchargeConditions = [
  { key: 'twentyFifthOfDecember', condition: start => start.format('DD/MM') === '25/12', name: '25 Décembre' },
  { key: 'firstOfMay', condition: start => start.format('DD/MM') === '01/05', name: '1er Mai' },
  { key: 'firstOfJanuary', condition: start => start.format('DD/MM') === '01/01', name: '1er Janvier' },
  { key: 'publicHoliday', condition: start => moment(start).startOf('d').isHoliday(), name: 'Jour férié' },
  { key: 'saturday', condition: start => start.isoWeekday() === 6, name: 'Samedi' },
  { key: 'sunday', condition: start => start.isoWeekday() === 7, name: 'Dimanche' },
];

exports.getEventSurcharges = (event, surcharge) => {
  const start = moment(event.startDate);
  const end = moment(event.endDate);
  const eventRange = moment.range(start, end);

  const surcharges = [];
  const { evening, eveningEndTime, eveningStartTime, custom, customStartTime, customEndTime } = surcharge;

  const eveningSurcharge = exports.getCustomSurcharge(start, end, eveningStartTime, eveningEndTime, evening);
  if (eveningSurcharge) surcharges.push({ ...eveningSurcharge, name: 'Soirée' });

  const customSurcharge = exports.getCustomSurcharge(start, end, customStartTime, customEndTime, custom);
  if (customSurcharge) surcharges.push({ ...customSurcharge, name: 'Personalisée' });

  const hourlySurcharges = surcharges;
  for (const hourlySurcharge of hourlySurcharges) {
    for (const surchargeCondition of surchargeConditions) {
      const percentage = surcharge[surchargeCondition.key] || 0;
      if (surchargeCondition.condition(start)) {
        if (percentage >= hourlySurcharge.percentage) return [{ percentage, name: surchargeCondition.name }];
        const surchargeRange = moment.range(hourlySurcharge.startHour, hourlySurcharge.endHour);
        const intersection = eventRange.intersect(surchargeRange);
        const diff = eventRange.subtract(intersection) || {};

        if (diff.length && Object.keys(diff[0]).length) {
          surcharges.push({
            percentage,
            startHour: diff[0].start.toDate(),
            endHour: diff[0].end.toDate(),
            name: surchargeCondition.name,
          });
          return surcharges;
        }
      }
    }
  }
  return surcharges;
};
