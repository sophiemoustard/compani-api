const expect = require('expect');
const { _mockCurrentDate, _unmockCurrentDate, mockCurrentDateAndRunAsync } = require('../../mockCurrentDate');
const CompaniDatesHelper = require('../../../../src/helpers/dates/companiDates');

describe('mockCurrentDate', () => {
  it('should mock now with another date and unmock after', async () => {
    const currentInMillis = CompaniDatesHelper.CompaniDate()._getDate.toMillis();

    const expectedCurrentDate = '2021-12-20T07:00:00.000Z';
    const expectedCurrentDateInMillis = CompaniDatesHelper.CompaniDate(expectedCurrentDate)._getDate.toMillis();

    _mockCurrentDate(expectedCurrentDate);

    const mockedCurrent = CompaniDatesHelper.CompaniDate()._getDate.toMillis();
    expect(mockedCurrent).toBeGreaterThanOrEqual(expectedCurrentDateInMillis);
    expect(mockedCurrent).toBeLessThan(expectedCurrentDateInMillis + 1000);

    _unmockCurrentDate();

    const unmockedCurrent = CompaniDatesHelper.CompaniDate()._getDate.toMillis();
    expect(unmockedCurrent).toBeGreaterThanOrEqual(currentInMillis);
    expect(unmockedCurrent).toBeLessThan(currentInMillis + 1000);
  });

  it('should embed a OK test execution with mocking and unmocking the current date', async () => {
    const currentInMillis = CompaniDatesHelper.CompaniDate()._getDate.toMillis();

    const expectedCurrentDate = '2021-12-20T07:00:00.000Z';
    const testToRun = () => {
      const mockedDate = CompaniDatesHelper.CompaniDate().toISO();
      expect(mockedDate).toEqual(expectedCurrentDate);
    };

    await mockCurrentDateAndRunAsync(testToRun, expectedCurrentDate);
    const unmockedCurrent = CompaniDatesHelper.CompaniDate()._getDate.toMillis();
    expect(unmockedCurrent).toBeGreaterThanOrEqual(currentInMillis);
    expect(unmockedCurrent).toBeLessThan(currentInMillis + 1000);
  });

  it('should embed a KO test execution with mocking and unmocking the current date', async () => {
    const currentInMillis = CompaniDatesHelper.CompaniDate()._getDate.toMillis();

    const expectedCurrentDate = '2021-12-20T07:00:00.000Z';
    const testToRun = async () => {
      const mockedDate = CompaniDatesHelper.CompaniDate().toISO();
      expect(mockedDate).toEqual('shalom aleichem');
    };

    let errorMatcherResult;
    try {
      await mockCurrentDateAndRunAsync(testToRun, expectedCurrentDate);
    } catch (e) {
      errorMatcherResult = e.matcherResult;
    }

    expect(errorMatcherResult.actual).toEqual('2021-12-20T07:00:00.000Z');
    expect(errorMatcherResult.expected).toEqual('shalom aleichem');

    const unmockedCurrent = CompaniDatesHelper.CompaniDate()._getDate.toMillis();
    expect(unmockedCurrent).toBeGreaterThanOrEqual(currentInMillis);
    expect(unmockedCurrent).toBeLessThan(currentInMillis + 1000);
  });
});
