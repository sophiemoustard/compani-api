const expect = require('expect');
const { mockCurrentDate } = require('../../mockCurrentDate');
const CompaniDatesHelper = require('../../../../src/helpers/dates/companiDates');

describe('mockCurrentDate', () => {
  it('should mock now with another date', () => {
    const expectedCurrentDate = '2021-12-20T07:00:00.000Z';
    const expectedCurrentDateInMillis = CompaniDatesHelper.CompaniDate(expectedCurrentDate)._getDate.toMillis();
    mockCurrentDate(expectedCurrentDate);

    const actual = CompaniDatesHelper.CompaniDate()._getDate.toMillis();

    expect(actual).toBeGreaterThanOrEqual(expectedCurrentDateInMillis);
    expect(actual).toBeLessThan(expectedCurrentDateInMillis + 1000);
  });
});
