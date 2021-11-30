const luxon = require('luxon');

exports.CompaniDuration = (...args) => companiDurationFactory(exports._formatMiscToCompaniDuration(...args));

const companiDurationFactory = _duration => ({
  _duration,
});

exports._formatMiscToCompaniDuration = (...args) => {
  if (args.length === 1) {
    if (typeof args[0] === 'number') {
      return luxon.Duration.fromMillis(args[0]);
    }
  }
  return luxon.Duration.invalid('wrong arguments');
};
