const { expect } = require('expect');
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

describe('ascendingSortBy', () => {
  it('should sort array in ascending order (based on startDate)', () => {
    const slots = [
      { startDate: '2021-01-01T12:00:00.000Z', endDate: '2021-01-01T14:00:00.000Z' },
      { startDate: '2021-01-04T12:00:00.000Z', endDate: '2021-01-04T14:00:00.000Z' },
      { startDate: '2021-03-01T12:00:00.000Z', endDate: '2021-03-01T14:00:00.000Z' },
      { startDate: '2020-12-01T12:00:00.000Z', endDate: '2020-12-01T14:00:00.000Z' },
    ];
    const result = slots.sort(UtilsHelper.ascendingSortBy('startDate'));
    expect(result).toEqual([
      { startDate: '2020-12-01T12:00:00.000Z', endDate: '2020-12-01T14:00:00.000Z' },
      { startDate: '2021-01-01T12:00:00.000Z', endDate: '2021-01-01T14:00:00.000Z' },
      { startDate: '2021-01-04T12:00:00.000Z', endDate: '2021-01-04T14:00:00.000Z' },
      { startDate: '2021-03-01T12:00:00.000Z', endDate: '2021-03-01T14:00:00.000Z' },
    ]);
  });
});

describe('descendingSortBy', () => {
  it('should sort array in descending order (based on startDate)', () => {
    const slots = [
      { startDate: '2020-12-01T12:00:00.000Z', endDate: '2020-12-01T14:00:00.000Z' },
      { startDate: '2021-01-04T12:00:00.000Z', endDate: '2021-01-04T14:00:00.000Z' },
      { startDate: '2021-03-01T12:00:00.000Z', endDate: '2021-03-01T14:00:00.000Z' },
      { startDate: '2021-01-01T12:00:00.000Z', endDate: '2021-01-01T14:00:00.000Z' },
    ];
    const result = slots.sort(UtilsHelper.descendingSortBy('startDate'));
    expect(result).toEqual([
      { startDate: '2021-03-01T12:00:00.000Z', endDate: '2021-03-01T14:00:00.000Z' },
      { startDate: '2021-01-04T12:00:00.000Z', endDate: '2021-01-04T14:00:00.000Z' },
      { startDate: '2021-01-01T12:00:00.000Z', endDate: '2021-01-01T14:00:00.000Z' },
      { startDate: '2020-12-01T12:00:00.000Z', endDate: '2020-12-01T14:00:00.000Z' },
    ]);
  });
});
