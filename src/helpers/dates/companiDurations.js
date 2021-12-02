const luxon = require('luxon');

exports.CompaniDuration = (...args) => companiDurationFactory(exports._formatMiscToCompaniDuration(...args));

const companiDurationFactory = _duration => ({
  _duration,

  format() {
    const durationInHoursAndMinutes = this._duration.shiftTo('hours', 'minutes');
    const format = Math.floor(durationInHoursAndMinutes.get('minutes')) > 0 ? 'h\'h\'mm' : 'h\'h\'';

    return this._duration.toFormat(format);
  },

  add(miscTypeOtherDuration) {
    const otherDuration = exports._formatMiscToCompaniDuration(miscTypeOtherDuration);

    this._duration = this._duration.plus(otherDuration);

    return this;
  },
});

exports._formatMiscToCompaniDuration = (...args) => {
  if (args.length === 0) return luxon.Duration.fromObject({});

  if (args.length === 1) {
    if (args[0] instanceof Object && args[0]._duration && args[0]._duration instanceof luxon.Duration) {
      return args[0]._duration;
    }
    if (typeof args[0] === 'number') {
      return luxon.Duration.fromMillis(args[0]);
    }
  }
  return luxon.Duration.invalid('wrong arguments');
};
