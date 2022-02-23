const expect = require('expect');
const MockUtils = require('../../mockUtils');
const CompaniDatesHelper = require('../../../src/helpers/dates/companiDates');

describe('mockCurrentDate', () => {
  it('should mock now with another date and unmock after', async () => {
    const currentInMillis = CompaniDatesHelper.CompaniDate()._getDate.toMillis();

    const expectedCurrentDate = '2021-12-20T07:00:00.000Z';
    const expectedCurrentDateInMillis = CompaniDatesHelper.CompaniDate(expectedCurrentDate)._getDate.toMillis();

    MockUtils.mockCurrentDate(expectedCurrentDate);

    const mockedCurrent = CompaniDatesHelper.CompaniDate()._getDate.toMillis();
    expect(mockedCurrent).toBeGreaterThanOrEqual(expectedCurrentDateInMillis);
    expect(mockedCurrent).toBeLessThan(expectedCurrentDateInMillis + 1000);

    MockUtils.unmockCurrentDate();

    const unmockedCurrent = CompaniDatesHelper.CompaniDate()._getDate.toMillis();
    expect(unmockedCurrent).toBeGreaterThanOrEqual(currentInMillis);
    expect(unmockedCurrent).toBeLessThan(currentInMillis + 1000);
  });
});
