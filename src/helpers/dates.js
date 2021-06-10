exports.isBefore = (date1, date2) => new Date(date1) < new Date(date2);

exports.isSameOrBefore = (date1, date2) => new Date(date1) <= new Date(date2);

exports.isAfter = (date1, date2) => new Date(date1) > new Date(date2);

exports.isSameOrAfter = (date1, date2) => new Date(date1) >= new Date(date2);

exports.diff = (date1, date2) => new Date(date1) - new Date(date2);

exports.getStartOfDay = date => (new Date(date)).setHours(0, 0, 0, 0);

exports.getEndOfDay = date => (new Date(date)).setHours(23, 59, 59, 999);

exports.dayDiff = (date1, date2) => {
  const milliSecondsDiff = new Date(date1) - new Date(date2);

  const diff = milliSecondsDiff > 0
    ? Math.floor(milliSecondsDiff / 1000 / 60 / 60 / 24)
    : Math.ceil(milliSecondsDiff / 1000 / 60 / 60 / 24);

  return diff || 0;
};

exports.dayDiffRegardlessOfHour = (date1, date2) => {
  const milliSecondsDiff = this.getStartOfDay(date1) - this.getStartOfDay(date2);

  return milliSecondsDiff / 1000 / 60 / 60 / 24;
};

exports.addDays = (date, days) => {
  const newDate = new Date(date);

  return new Date(newDate.setDate(newDate.getDate() + days));
};

const DATE_FORMATS = {
  D: { day: 'numeric' },
  DD: { day: '2-digit' },
  MM: { month: '2-digit' },
  MMM: { month: 'short' },
  MMMM: { month: 'long' },
  YY: { year: '2-digit' },
  YYYY: { year: 'numeric' },
  h: { hour: 'numeric' },
  hh: { hour: '2-digit' },
  m: { minute: 'numeric' },
  mm: { minute: '2-digit' },
  s: { second: 'numeric' },
  ss: { second: '2-digit' },
};

exports.format = (date, format = '') => {
  if (!date) return null;

  const options = format.split(' ').map(f => DATE_FORMATS[f]);

  return new Date(date).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', ...Object.assign({}, ...options) });
};

exports.formatDateAndTime = (date, format = '') => {
  if (!date) return null;
  const options = format.split(' ').map(f => DATE_FORMATS[f]);

  return new Date(date).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', ...Object.assign({}, ...options) })
    .replace('à ', '');
};

exports.descendingSort = key => (a, b) => new Date(b[key]) - new Date(a[key]);
