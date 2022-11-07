const expect = require('expect');
const UtilsHelper = require('../../../../src/helpers/dates/utils');

describe('ascendingSort', () => {
  it('should return a positive value if b < a', () => {
    const result = UtilsHelper.ascendingSort('2021-01-01T12:00:00.000Z', '2020-12-01T12:00:00.000Z');
    expect(result > 0).toBe(true);
  });

  it('should return a negative value if b > a', () => {
    const result = UtilsHelper.ascendingSort('2020-12-01T12:00:00.000Z', '2021-01-01T12:00:00.000Z');
    expect(result < 0).toBe(true);
  });

  it('should return 0 if b = a', () => {
    const result = UtilsHelper.ascendingSort('2021-01-01T12:00:00.000Z', '2021-01-01T12:00:00.000Z');
    expect(result).toBe(0);
  });
});

describe('descendingSort', () => {
  it('should return a positive value if b > a', () => {
    const result = UtilsHelper.descendingSort('2020-12-01T12:00:00.000Z', '2021-01-01T12:00:00.000Z');
    expect(result > 0).toBe(true);
  });

  it('should return a negative value if b < a', () => {
    const result = UtilsHelper.descendingSort('2021-01-01T12:00:00.000Z', '2020-12-01T12:00:00.000Z');
    expect(result < 0).toBe(true);
  });

  it('should return 0 if b = a', () => {
    const result = UtilsHelper.descendingSort('2021-01-01T12:00:00.000Z', '2021-01-01T12:00:00.000Z');
    expect(result).toBe(0);
  });
});
