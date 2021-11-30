const luxon = require('luxon');

luxon.Settings.defaultLocale = 'fr';

exports.CompaniDate = (...args) => companiDateFactory(exports._formatMiscToCompaniDate(...args));

const companiDateFactory = _date => ({
  _date,

  format(fmt) {
    return this._date.toFormat(fmt);
  },
  isSame(miscTypeOtherDate, unit) {
    const otherDate = exports._formatMiscToCompaniDate(miscTypeOtherDate);

    return this._date.hasSame(otherDate, unit);
  },
  diff(miscTypeOtherDate, unit = 'milliseconds', typeFloat = false) {
    const otherDate = exports._formatMiscToCompaniDate(miscTypeOtherDate);
    const floatDiff = this._date.diff(otherDate, unit).as(unit);

    if (typeFloat) return floatDiff;
    return floatDiff > 0 ? Math.floor(floatDiff) : Math.ceil(floatDiff);
  },
});

exports._formatMiscToCompaniDate = (...args) => {
  if (!args.length) return luxon.DateTime.now();

  if (args.length === 1) {
    if (args[0] instanceof Object && args[0]._date && args[0]._date instanceof luxon.DateTime) return args[0]._date;
    if (args[0] instanceof luxon.DateTime) return args[0];
    if (args[0] instanceof Date) return luxon.DateTime.fromJSDate(args[0]);
    if (typeof args[0] === 'string') return luxon.DateTime.fromISO(args[0]);
  }

  if (args.length === 2 && typeof args[0] === 'string' && typeof args[1] === 'string') {
    const options = args[0].endsWith('Z') ? { zone: 'utc' } : {};
    return luxon.DateTime.fromFormat(args[0], args[1], options);
  }

  return luxon.DateTime.invalid('wrong arguments');
};
