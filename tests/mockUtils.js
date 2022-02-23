const luxon = require('../src/helpers/dates/luxon');

const mockCurrentDate = (mockedCurrentISO) => {
  const luxonExpectedNow = luxon.DateTime.fromISO(mockedCurrentISO);

  luxon.Settings.now = () => luxonExpectedNow.toMillis();
};

const unmockCurrentDate = () => {
  luxon.Settings.now = () => Date.now();
};

module.exports = { mockCurrentDate, unmockCurrentDate };
