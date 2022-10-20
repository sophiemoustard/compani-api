const { DURATION_UNITS, Hh, HhMM, Mmin, HhMMmin } = require('../constants');
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
    format(template) {
      const shiftedDuration = _duration.shiftTo('hours', 'minutes', 'seconds');
      const minutes = shiftedDuration.get('minutes');
      const hours = shiftedDuration.get('hours');

      if (template === HhMM) {
        if (minutes === 0) return _duration.toFormat(Hh);

        return _duration.toFormat(HhMM);
      } if (template === HhMMmin) {
        if (hours === 0) return _duration.toFormat(Mmin);
        if (minutes === 0) return _duration.toFormat(Hh);

        return _duration.toFormat(HhMMmin);
      }
      throw Error('Invalid argument: expected specific format');
    },

    asHours() {
      return _duration.as('hours');
    },

    asSeconds() {
      return _duration.as('seconds');
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
