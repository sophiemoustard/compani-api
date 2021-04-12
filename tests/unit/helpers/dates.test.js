const expect = require('expect');
const DatesHelper = require('../../../src/helpers/dates');

describe('isBefore', () => {
  it('should return true if date1 is before date2', () => {
    const isBefore = DatesHelper.isBefore('2020-01-01', new Date());

    expect(isBefore).toBe(true);
  });

  it('should return false if date1 is after date2', () => {
    const isBefore = DatesHelper.isBefore('2020-01-01', '2019-02-03');

    expect(isBefore).toBe(false);
  });
});

describe('isAfter', () => {
  it('should return true if date1 is after date2', () => {
    const isAfter = DatesHelper.isAfter(new Date('2020-12-25'), '2020-07-14');

    expect(isAfter).toBe(true);
  });

  it('should return false if date1 is before date2', () => {
    const isAfter = DatesHelper.isAfter('2020-01-01', new Date());

    expect(isAfter).toBe(false);
  });
});
