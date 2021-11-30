const luxon = require('luxon');

exports.CompaniDuration = (...args) => companiDurationFactory(exports._formatMiscToCompanyDuration(...args));

const companiDurationFactory = _duration => ({
  _duration,
});

exports._formatMiscToCompanyDuration = (...args) => {
  if (args.length === 1) {
    if (typeof args[0] === 'number') {
      return luxon.Duration.fromMillis(args[0]);
    }
  }
  return luxon.Duration.invalid('wrong arguments');
};
