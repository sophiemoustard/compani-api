const expect = require('expect');
const DatesHelper = require('../../../src/helpers/dates');

describe('isBefore', () => {
  it('should return true if date1 is before date2', () => {
    const isBefore = DatesHelper.isBefore('2020-01-01T09:00:00', '2020-01-01T11:00:00');

    expect(isBefore).toBe(true);
  });

  it('should return false if date1 is after date2', () => {
    const isBefore = DatesHelper.isBefore('2020-01-01T09:00:00', '2020-01-01T07:00:00');

    expect(isBefore).toBe(false);
  });

  it('should return false if date1 is equal to date2', () => {
    const isBefore = DatesHelper.isBefore('2020-01-01T09:00:00', '2020-01-01T09:00:00');

    expect(isBefore).toBe(false);
  });

  it('should return false if date1 and date2 are on same day, comparing days', () => {
    const isBefore = DatesHelper.isBefore('2020-01-01T09:00:00', '2020-01-01T07:00:00', 'd');

    expect(isBefore).toBe(false);
  });
});

describe('isSameOrBefore', () => {
  it('should return true if date1 is before date2', () => {
    const isBefore = DatesHelper.isSameOrBefore('2020-01-01T09:00:00', '2021-01-11T09:00:00');

    expect(isBefore).toBe(true);
  });

  it('should return false if date1 is after date2', () => {
    const isBefore = DatesHelper.isSameOrBefore('2020-01-01T09:00:00', '2019-02-03');

    expect(isBefore).toBe(false);
  });

  it('should return true if date1 is after date2 but on same day, comparing days', () => {
    const isBefore = DatesHelper.isSameOrBefore('2020-01-01T11:00:00', '2020-01-01T09:00:00', 'd');

    expect(isBefore).toBe(true);
  });

  it('should return true if date1 is equal to date2', () => {
    const isBefore = DatesHelper.isSameOrBefore('2020-01-01T09:00:00', '2020-01-01T09:00:00');

    expect(isBefore).toBe(true);
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

  it('should return false if date1 is equal to date2', () => {
    const isAfter = DatesHelper.isAfter('2020-01-01', '2020-01-01');

    expect(isAfter).toBe(false);
  });

  it('should return true if date1 is after date2 comparing days', () => {
    const isAfter = DatesHelper.isAfter(new Date('2020-12-25T12:00:00.000Z'), '2020-12-23T16:00:00.000Z', 'd');

    expect(isAfter).toBe(true);
  });

  it('should return false if date1 is before date2 comparing days', () => {
    const isAfter = DatesHelper.isAfter('2020-12-25T12:00:00.000Z', '2020-12-27T16:00:00.000Z', 'd');

    expect(isAfter).toBe(false);
  });

  it('should return false if date1 is equal to date2 comparing days', () => {
    const isAfter = DatesHelper.isAfter('2020-12-25T12:00:00.000Z', '2020-12-25T09:00:00.000Z', 'd');

    expect(isAfter).toBe(false);
  });
});

describe('isSameOrAfter', () => {
  it('should return true if date1 is after date2', () => {
    const isAfter = DatesHelper.isSameOrAfter(new Date('2020-12-25'), '2020-07-14');

    expect(isAfter).toBe(true);
  });

  it('should return false if date1 is before date2', () => {
    const isAfter = DatesHelper.isSameOrAfter('2020-01-01', new Date());

    expect(isAfter).toBe(false);
  });

  it('should return true if date1 is equal to date2', () => {
    const isAfter = DatesHelper.isSameOrAfter('2020-01-01', '2020-01-01');

    expect(isAfter).toBe(true);
  });

  it('should return true if date1 is after date2 comparing days', () => {
    const isAfter = DatesHelper.isSameOrAfter(new Date('2020-12-25T12:00:00.000Z'), '2020-12-23T16:00:00.000Z', 'd');

    expect(isAfter).toBe(true);
  });

  it('should return false if date1 is before date2 comparing days', () => {
    const isAfter = DatesHelper.isSameOrAfter('2020-12-25T12:00:00.000Z', '2020-12-27T16:00:00.000Z', 'd');

    expect(isAfter).toBe(false);
  });

  it('should return true if date1 is equal to date2 comparing days', () => {
    const isAfter = DatesHelper.isSameOrAfter('2020-12-25T12:00:00.000Z', '2020-12-25T09:00:00.000Z', 'd');

    expect(isAfter).toBe(true);
  });
});

describe('dayDiff', () => {
  it('should return number of days between two dates', () => {
    const date1 = '2021-01-05T10:04:34';
    const date2 = '2021-01-01T09:15:24';

    const result = DatesHelper.dayDiff(date1, date2);

    expect(result).toBe(4);
  });

  it('should return number of days between two dates', () => {
    const date1 = '2021-01-05T10:04:34';
    const date2 = '2021-01-04T11:04:54';

    const result = DatesHelper.dayDiff(date1, date2);

    expect(result).toBe(0);
  });

  it('should return number of days between two dates', () => {
    const date1 = '2021-01-05T10:04:34';
    const date2 = '2021-01-05T11:04:54';

    const result = DatesHelper.dayDiff(date1, date2);

    expect(result).toBe(0);
  });

  it('should return number of days between two dates', () => {
    const date1 = '2021-01-04T10:04:34';
    const date2 = '2021-01-05T11:04:54';

    const result = DatesHelper.dayDiff(date1, date2);

    expect(result).toBe(-1);
  });
});

describe('addDays', () => {
  it('should add days to date', () => {
    const newDate = DatesHelper.addDays('2020-12-25', 9);
    const resultDate = new Date('2021-01-03');

    expect(newDate.toString()).toBe(resultDate.toString());
  });
});

describe('format', () => {
  it('should null if no date', () => {
    const formattedDate = DatesHelper.format();
    expect(formattedDate).toBeNull();
  });

  it('should full date if no format', () => {
    const formattedDate = DatesHelper.format('2021-04-30T22:00:00.000Z');
    expect(formattedDate).toEqual('01/05/2021');
  });

  it('should return numeric day', () => {
    const formattedDate = DatesHelper.format('2021-04-30T22:00:00.000Z', 'D');
    expect(formattedDate).toEqual('1');
  });

  it('should return 2-digit day', () => {
    const formattedDate = DatesHelper.format('2021-04-30T22:00:00.000Z', 'DD');
    expect(formattedDate).toEqual('01');
  });

  it('should return 2-digit month', () => {
    const formattedDate = DatesHelper.format('2021-04-30T22:00:00.000Z', 'MM');
    expect(formattedDate).toEqual('05');
  });

  it('should return short month', () => {
    const formattedDate = DatesHelper.format('2021-03-31T22:00:00.000Z', 'MMM');
    expect(formattedDate).toEqual('avr.');
  });

  it('should return long month', () => {
    const formattedDate = DatesHelper.format('2021-03-31T22:00:00.000Z', 'MMMM');
    expect(formattedDate).toEqual('avril');
  });

  it('should return 2-digit year', () => {
    const formattedDate = DatesHelper.format('2020-12-31T23:00:00.000Z', 'YY');
    expect(formattedDate).toEqual('21');
  });

  it('should return numeric year', () => {
    const formattedDate = DatesHelper.format('2020-12-31T23:00:00.000Z', 'YYYY');
    expect(formattedDate).toEqual('2021');
  });
});
