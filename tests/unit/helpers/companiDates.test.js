const expect = require('expect');
const luxon = require('luxon');
const sinon = require('sinon');
const CompaniDatesHelper = require('../../../src/helpers/companiDates');

describe('isSame', () => {
  it('should return true if same day', () => {
    const date = new Date('2021-11-24T07:00:00.000Z');
    const otherDate = new Date('2021-11-24T10:00:00.000Z');
    const result = CompaniDatesHelper.CompaniDate(date).isSame(otherDate, 'day');

    expect(result).toBeTruthy();
  });

  it('should return false if different minute', () => {
    const date = new Date('2021-11-24T07:00:00.000Z');
    const otherDate = new Date('2021-11-24T10:00:00.000Z');
    const result = CompaniDatesHelper.CompaniDate(date).isSame(otherDate, 'minute');

    expect(result).toBeFalsy();
  });
});

describe('_instantiateDateTimeFromMisc', () => {
  let now;
  let fromJSDate;
  let fromISO;
  let fromFormat;
  let invalid;

  beforeEach(() => {
    now = sinon.stub(luxon.DateTime, 'now');
    fromJSDate = sinon.stub(luxon.DateTime, 'fromJSDate');
    fromISO = sinon.stub(luxon.DateTime, 'fromISO');
    fromFormat = sinon.stub(luxon.DateTime, 'fromFormat');
    invalid = sinon.stub(luxon.DateTime, 'invalid');
  });

  afterEach(() => {
    now.restore();
    fromJSDate.restore();
    fromISO.restore();
    fromFormat.restore();
    invalid.restore();
  });

  it('should return dateTime.now if no arg', () => {
    now.returns({ isLuxonDateTime: true });
    const result = CompaniDatesHelper._instantiateDateTimeFromMisc();

    expect(result).toMatchObject({ isLuxonDateTime: true });
  });

  const dates = [
    { type: 'object with dateTime', date: { _date: new luxon.DateTime('2021-11-24T07:00:00.000Z') } },
    { type: 'dateTime', date: new luxon.DateTime('2021-11-24T07:00:00.000Z') },
    { type: 'date', date: new Date('2021-11-24T07:00:00.000Z') },
    { type: 'string', date: '2021-11-24T07:00:00.000Z' },
  ];
  it(`should return dateTime if arg is ${dates[0].type}`, () => {
    const result = CompaniDatesHelper._instantiateDateTimeFromMisc(dates[0].date);
    expect(result).toBe(dates[0].date._date);
  });

  it(`should return dateTime if arg is ${dates[1].type}`, () => {
    const result = CompaniDatesHelper._instantiateDateTimeFromMisc(dates[1].date);

    expect(result).toBe(dates[1].date);
  });

  it(`should return dateTime if arg is ${dates[2].type}`, () => {
    fromJSDate.returns({ isLuxonDateTime: true });
    const result = CompaniDatesHelper._instantiateDateTimeFromMisc(dates[2].date);

    expect(result).toMatchObject({ isLuxonDateTime: true });
  });

  it(`should return dateTime if arg is ${dates[3].type}`, () => {
    fromISO.returns({ isLuxonDateTime: true });
    const result = CompaniDatesHelper._instantiateDateTimeFromMisc(dates[3].date);

    expect(result).toMatchObject({ isLuxonDateTime: true });
  });

  it('should return dateTime if 2 args', () => {
    fromFormat.returns({ isLuxonDateTime: true });
    const result = CompaniDatesHelper._instantiateDateTimeFromMisc('2021-11-24T07:00:00.000Z', 'MMMM dd yyyy');

    expect(result).toMatchObject({ isLuxonDateTime: true });
  });

  it('should return dateTime if too many args', () => {
    invalid.returns({ invalid: { reason: 'wrong arguments', explanation: null } });
    const result = CompaniDatesHelper
      ._instantiateDateTimeFromMisc('2021-11-24T07:00:00.000Z', 'MMMM dd yyyy', { locale: 'fr' });

    expect(result).toMatchObject({ invalid: { reason: 'wrong arguments', explanation: null } });
  });
});
