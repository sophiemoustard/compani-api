const luxon = require('../../src/helpers/dates/luxon');

const _mockCurrentDate = (mockedCurrentISO) => {
  const luxonExpectedNow = luxon.DateTime.fromISO(mockedCurrentISO);

  luxon.Settings.now = () => luxonExpectedNow.toMillis();
};

const _unmockCurrentDate = () => {
  const currentDate = new Date();
  luxon.Settings.now = () => currentDate.getTime();
};

const mockCurrentDateAndRunAsync = async (runTest, mockedCurrentISO) => {
  _mockCurrentDate(mockedCurrentISO);
  try {
    await runTest();
  } finally {
    _unmockCurrentDate();
  }
};

module.exports = { _mockCurrentDate, _unmockCurrentDate, mockCurrentDateAndRunAsync };
