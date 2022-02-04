const Holidays = require('date-holidays');
const memoize = require('lodash/memoize');

const OMITED_HOLIDAYS = ['easter 49', 'easter 50', 'sunday before 06-01'];

const _getHolidays = (year) => {
  const holidays = new Holidays('FR');
  const yearHolidays = holidays.getHolidays(year);

  return yearHolidays
    .filter(h => !OMITED_HOLIDAYS.includes(h.rule))
    .map(h => h.start);
};

exports.getHolidays = memoize(_getHolidays);
