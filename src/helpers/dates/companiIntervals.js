const luxon = require('./luxon');
const { CompaniDuration } = require('./companiDurations');

exports.CompaniInterval = (...args) => CompaniIntervalFactory(exports._formatMiscToCompaniInterval(...args));

const CompaniIntervalFactory = (inputInterval) => {
  const _interval = inputInterval;

  return ({
    get _getInterval() {
      return _interval;
    },

    rangeBy(miscTypeDurationStep, excludeEnd = false) {
      // after spliting "outil" from "formation", first argument should be only duration in string ISO
      // const luxonDurationStep = luxon.Duration.fromISO(durationISO);
      const luxonDurationStep = CompaniDuration(miscTypeDurationStep)._getDuration;
      if (luxonDurationStep.toMillis() === 0) throw new Error('invalid argument : duration is zero');

      const fragmentedIntervals = _interval.splitBy(luxonDurationStep);
      const dates = fragmentedIntervals.map(fi => fi.start.toUTC().toISO());

      const lastFragmentEqualsDurationStep =
        fragmentedIntervals[fragmentedIntervals.length - 1].toDuration().toMillis() === luxonDurationStep.toMillis();
      if (lastFragmentEqualsDurationStep) dates.push(_interval.end.toUTC().toISO());

      return excludeEnd ? dates.slice(0, -1) : dates;
    },
  });
};

const isCompaniInterval = arg =>
  arg instanceof Object && arg._getInterval && arg._getInterval instanceof luxon.Interval;

exports._formatMiscToCompaniInterval = (...args) => {
  if (args.length === 1) {
    if (isCompaniInterval(args[0])) return args[0]._getInterval;
  }
  if (args.length === 2) {
    if (typeof args[0] === 'string' && typeof args[1] === 'string') {
      const luxonDate1 = luxon.DateTime.fromISO(args[0]);
      const luxonDate2 = luxon.DateTime.fromISO(args[1]);
      return luxon.Interval.fromDateTimes(luxonDate1, luxonDate2);
    }
  }

  return luxon.Interval.invalid('wrong arguments');
};
