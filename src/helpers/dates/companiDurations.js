const { DURATION_UNITS } = require('../constants');
const luxon = require('./luxon');

exports.CompaniDuration = (...args) => companiDurationFactory(exports._formatMiscToCompaniDuration(...args));

const companiDurationFactory = (inputDuration) => {
  let _duration = inputDuration;

  return {
    get _getDuration() {
      return _duration;
    },

    format() {
      const durationInHoursAndMinutes = _duration.shiftTo('hours', 'minutes');
      const format = Math.floor(durationInHoursAndMinutes.get('minutes')) > 0 ? 'h\'h\'mm' : 'h\'h\'';

      return _duration.toFormat(format);
    },

    add(miscTypeOtherDuration) {
      const otherDuration = exports._formatMiscToCompaniDuration(miscTypeOtherDuration);

      _duration = _duration.plus(otherDuration);

      return this;
    },

    asHours() {
      return _duration.as('hours');
    },
  };
};

exports._formatMiscToCompaniDuration = (...args) => {
  if (args.length === 0) return luxon.Duration.fromObject({});

  if (args.length === 1) {
    if (args[0] instanceof Object) {
      if (args[0]._getDuration && args[0]._getDuration instanceof luxon.Duration) return args[0]._getDuration;
      if (Object.keys(args[0]).every(key => DURATION_UNITS.includes(key))) return luxon.Duration.fromObject(args[0]);
    }
  }
  return luxon.Duration.invalid('wrong arguments');
};
