const luxon = require('./luxon');

exports.CompaniInterval = (...args) => CompaniIntervalFactory(exports._formatMiscToCompaniInterval(...args));

const CompaniIntervalFactory = (inputInterval) => {
  const _interval = inputInterval;

  return ({
    get _getInterval() {
      return _interval;
    },
  });
};

const isCompaniDate = arg => arg instanceof Object && arg._getDate && arg._getDate instanceof luxon.DateTime;
const isCompaniInterval = arg =>
  arg instanceof Object && arg._getInterval && arg._getInterval instanceof luxon.Interval;

exports._formatMiscToCompaniInterval = (...args) => {
  if (args.length === 1) {
    if (typeof args[0] === 'string' && args[0] !== '') return luxon.Interval.fromISO(args[0]);
    if (isCompaniInterval(args[0])) return args[0]._getInterval;
  }
  if (args.length === 2) {
    if (isCompaniDate(args[0]) && isCompaniDate(args[1])) {
      return luxon.Interval.fromDateTimes(args[0]._getDate, args[1]._getDate);
    }
    if (typeof args[0] === 'string' && typeof args[1] === 'string') {
      const luxonDate1 = luxon.DateTime.fromISO(args[0]);
      const luxonDate2 = luxon.DateTime.fromISO(args[1]);
      return luxon.Interval.fromDateTimes(luxonDate1, luxonDate2);
    }
  }

  return luxon.Interval.invalid('wrong arguments');
};
