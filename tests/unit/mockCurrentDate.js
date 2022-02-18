const luxon = require('../../src/helpers/dates/luxon');

const mockCurrentDate = (expectedNowISO) => {
  const luxonExpectedNow = luxon.DateTime.fromISO(expectedNowISO);

  luxon.Settings.now = () => luxonExpectedNow.toMillis();
};

module.exports = { mockCurrentDate };
