const { DURATION_UNITS, HH_h_MM, HH_h_MM_min } = require('../constants');
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
      if (template === HH_h_MM) {
        const shiftedDuration = _duration.shiftTo('hours', 'minutes', 'seconds');

        if (shiftedDuration.get('minutes') > 0) return _duration.toFormat('h\'h\'mm');
        return _duration.toFormat('h\'h\'');
      } if (template === HH_h_MM_min) {
        const shiftedDuration = _duration.shiftTo('hours', 'minutes', 'seconds');

        if (shiftedDuration.get('hours') === 0) return _duration.toFormat('mm\'min\'');
        if (shiftedDuration.get('minutes') === 0) return _duration.toFormat('h\'h\'');
        return _duration.toFormat('h\'h\' mm\'min\'');
      }
      throw Error('Invalid argument: expected specific format');
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
