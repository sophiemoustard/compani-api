const luxon = require('../../src/helpers/dates/luxon');

const mockCurrentDate = (mockedCurrentISO) => {
  const luxonExpectedNow = luxon.DateTime.fromISO(mockedCurrentISO);

  luxon.Settings.now = () => luxonExpectedNow.toMillis();
};

const unmockCurrentDate = () => {
  const currentDate = new Date();
  luxon.Settings.now = () => currentDate.getTime();
};

module.exports = { mockCurrentDate, unmockCurrentDate };
