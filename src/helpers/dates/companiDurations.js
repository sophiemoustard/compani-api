const luxon = require('luxon');

exports.CompaniDuration = (...args) => companiDurationFactory(exports._formatMiscToCompaniDuration(...args));

const companiDurationFactory = _duration => ({
  _duration,

  format() {
    const durationInHoursAndMinutes = this._duration.shiftTo('hours', 'minutes');
    const format = Math.floor(durationInHoursAndMinutes.get('minutes')) > 0 ? 'h\'h\'mm' : 'h\'h\'';

    return _duration.toFormat(format);
  },
});

exports._formatMiscToCompaniDuration = (...args) => {
  if (args.length === 1) {
    if (typeof args[0] === 'number') {
      return luxon.Duration.fromMillis(args[0]);
    }
  }
  return luxon.Duration.invalid('wrong arguments');
};
