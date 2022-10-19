const { DURATION_UNITS } = require('../constants');
const luxon = require('./luxon');

exports.CompaniDuration = (...args) => companiDurationFactory(exports._formatMiscToCompaniDuration(...args));

const companiDurationFactory = (inputDuration) => {
  const _duration = inputDuration;

  return {
    // GETTER
    get _getDuration() {
      return _duration;
    },

    // DISPLAY
    format() {
      const durationInHoursAndMinutes = _duration.shiftTo('hours', 'minutes');
      const format = Math.floor(durationInHoursAndMinutes.get('minutes')) > 0 ? 'h\'h\'mm' : 'h\'h\'';

      return _duration.toFormat(format);
    },

    asHours() {
      return _duration.as('hours');
    },

    toObject() {
      return _duration.toObject();
    },

    toISO() {
      return _duration.toISO();
    },

    // MANIPULATE
    add(miscTypeOtherDuration) {
      const otherDuration = exports._formatMiscToCompaniDuration(miscTypeOtherDuration);

      return companiDurationFactory(_duration.plus(otherDuration));
    },
  };
};

exports._formatMiscToCompaniDuration = (...args) => {
  if (args.length === 0) return luxon.Duration.fromObject({});

  if (args.length === 1) {
    if (typeof args[0] === 'string') return luxon.Duration.fromISO(args[0]);

    if (args[0] instanceof Object) {
      if (args[0]._getDuration && args[0]._getDuration instanceof luxon.Duration) return args[0]._getDuration;
      if (Object.keys(args[0]).every(key => DURATION_UNITS.includes(key))) return luxon.Duration.fromObject(args[0]);
    }
  }
  return luxon.Duration.invalid('wrong arguments');
};
