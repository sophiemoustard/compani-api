const luxon = require('./luxon');

exports.CompaniDate = (...args) => companiDateFactory(exports._formatMiscToCompaniDate(...args));

const companiDateFactory = (inputDate) => {
  const _date = inputDate;

  return ({
    // GETTER
    get _date() {
      return _date;
    },

    // DISPLAY
    format(fmt) {
      return _date.toFormat(fmt);
    },

    // QUERY
    isSame(miscTypeOtherDate, unit) {
      const otherDate = exports._formatMiscToCompaniDate(miscTypeOtherDate);

      return _date.hasSame(otherDate, unit);
    },

    isSameOrBefore(miscTypeOtherDate, unit = 'millisecond') {
      const otherDate = exports._formatMiscToCompaniDate(miscTypeOtherDate);

      return (_date.hasSame(otherDate, unit) || _date.startOf(unit) < otherDate.startOf(unit));
    },

    // MANIPULATE
    diff(miscTypeOtherDate, unit = 'milliseconds', typeFloat = false) {
      const otherDate = exports._formatMiscToCompaniDate(miscTypeOtherDate);
      const floatDiff = _date.diff(otherDate, unit).as(unit);

      if (typeFloat) return floatDiff;
      return floatDiff > 0 ? Math.floor(floatDiff) : Math.ceil(floatDiff);
    },
  });
};

exports._formatMiscToCompaniDate = (...args) => {
  if (!args.length) return luxon.DateTime.now();

  if (args.length === 1) {
    if (args[0] instanceof Object && args[0]._date && args[0]._date instanceof luxon.DateTime) return args[0]._date;
    if (args[0] instanceof luxon.DateTime) return args[0];
    if (args[0] instanceof Date) return luxon.DateTime.fromJSDate(args[0]);
    if (typeof args[0] === 'string' && args[0] !== '') return luxon.DateTime.fromISO(args[0]);
  }

  if (args.length === 2 && typeof args[0] === 'string' && typeof args[1] === 'string') {
    const options = args[0].endsWith('Z') ? { zone: 'utc' } : {};
    return luxon.DateTime.fromFormat(args[0], args[1], options);
  }

  return luxon.DateTime.invalid('wrong arguments');
};
