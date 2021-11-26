const expect = require('expect');
const luxon = require('luxon');
const sinon = require('sinon');
const CompaniDatesHelper = require('../../../src/helpers/companiDates');

describe('isSame', () => {
  let _formatMiscToCompanyDate;
  const date = new Date('2021-11-24T07:00:00.000Z');
  const otherDate = new Date('2021-11-24T10:00:00.000Z');

  beforeEach(() => {
    _formatMiscToCompanyDate = sinon.spy(CompaniDatesHelper, '_formatMiscToCompanyDate');
  });

  afterEach(() => {
    _formatMiscToCompanyDate.restore();
  });

  it('should return true if same day', () => {
    const result = CompaniDatesHelper.CompaniDate(date).isSame(otherDate, 'day');

    expect(result).toBe(true);
    sinon.assert.calledWithExactly(_formatMiscToCompanyDate.getCall(0), date);
    sinon.assert.calledWithExactly(_formatMiscToCompanyDate.getCall(1), otherDate);
  });

  it('should return false if different minute', () => {
    const result = CompaniDatesHelper.CompaniDate(date).isSame(otherDate, 'minute');

    expect(result).toBe(false);
    sinon.assert.calledWithExactly(_formatMiscToCompanyDate.getCall(0), date);
    sinon.assert.calledWithExactly(_formatMiscToCompanyDate.getCall(1), otherDate);
  });
});

describe('_formatMiscToCompanyDate', () => {
  let now;
  let fromJSDate;
  let fromISO;
  let fromFormat;
  let invalid;
  const date = luxon.DateTime.fromISO('2021-11-24T07:00:00.000Z');

  beforeEach(() => {
    now = sinon.spy(luxon.DateTime, 'now');
    fromJSDate = sinon.spy(luxon.DateTime, 'fromJSDate');
    fromISO = sinon.spy(luxon.DateTime, 'fromISO');
    fromFormat = sinon.spy(luxon.DateTime, 'fromFormat');
    invalid = sinon.spy(luxon.DateTime, 'invalid');
  });

  afterEach(() => {
    now.restore();
    fromJSDate.restore();
    fromISO.restore();
    fromFormat.restore();
    invalid.restore();
  });

  it('should return dateTime.now if no arg', () => {
    const result = CompaniDatesHelper._formatMiscToCompanyDate();

    expect(result instanceof luxon.DateTime).toBe(true);
    expect(new luxon.DateTime(result).toJSDate() - new Date()).toBeLessThan(100);
    sinon.assert.calledOnceWithExactly(now);
    sinon.assert.notCalled(fromJSDate);
    sinon.assert.notCalled(fromISO);
    sinon.assert.notCalled(fromFormat);
    sinon.assert.notCalled(invalid);
  });

  const dates = [
    { type: 'object with dateTime', date: { _date: date } },
    { type: 'dateTime', date },
    { type: 'date', date: new Date('2021-11-24T07:00:00.000Z') },
    { type: 'string', date: '2021-11-24T07:00:00.000Z' },
  ];
  it(`should return dateTime if arg is ${dates[0].type}`, () => {
    const result = CompaniDatesHelper._formatMiscToCompanyDate(dates[0].date);

    expect(result instanceof luxon.DateTime).toBe(true);
    expect(new luxon.DateTime(result).toJSDate()).toEqual(new Date('2021-11-24T07:00:00.000Z'));
    sinon.assert.notCalled(now);
    sinon.assert.notCalled(fromJSDate);
    sinon.assert.notCalled(fromISO);
    sinon.assert.notCalled(fromFormat);
    sinon.assert.notCalled(invalid);
  });

  it(`should return dateTime if arg is ${dates[1].type}`, () => {
    const result = CompaniDatesHelper._formatMiscToCompanyDate(dates[1].date);

    expect(result instanceof luxon.DateTime).toBe(true);
    expect(new luxon.DateTime(result).toJSDate()).toEqual(new Date('2021-11-24T07:00:00.000Z'));
    sinon.assert.notCalled(now);
    sinon.assert.notCalled(fromJSDate);
    sinon.assert.notCalled(fromISO);
    sinon.assert.notCalled(fromFormat);
    sinon.assert.notCalled(invalid);
  });

  it(`should return dateTime if arg is ${dates[2].type}`, () => {
    const result = CompaniDatesHelper._formatMiscToCompanyDate(dates[2].date);

    expect(result instanceof luxon.DateTime).toBe(true);
    expect(new luxon.DateTime(result).toJSDate()).toEqual(new Date('2021-11-24T07:00:00.000Z'));
    sinon.assert.calledOnceWithExactly(fromJSDate, dates[2].date);
    sinon.assert.notCalled(now);
    sinon.assert.notCalled(fromISO);
    sinon.assert.notCalled(fromFormat);
    sinon.assert.notCalled(invalid);
  });

  it(`should return dateTime if arg is ${dates[3].type}`, () => {
    const result = CompaniDatesHelper._formatMiscToCompanyDate(dates[3].date);

    expect(result instanceof luxon.DateTime).toBe(true);
    expect(new luxon.DateTime(result).toJSDate()).toEqual(new Date('2021-11-24T07:00:00.000Z'));
    sinon.assert.calledOnceWithExactly(fromISO, dates[3].date);
    sinon.assert.notCalled(now);
    sinon.assert.notCalled(fromJSDate);
    sinon.assert.notCalled(fromFormat);
    sinon.assert.notCalled(invalid);
  });

  it('should return dateTime if 2 args', () => {
    const result = CompaniDatesHelper._formatMiscToCompanyDate(
      '2021-11-24T07:00:00.000Z',
      'yyyy-MM-dd\'T\'hh:mm:ss.SSS\'Z\''
    );

    expect(result instanceof luxon.DateTime).toBe(true);
    expect(new luxon.DateTime(result).toJSDate()).toEqual(new Date('2021-11-24T07:00:00.000Z'));
    sinon.assert.calledOnceWithExactly(
      fromFormat,
      '2021-11-24T07:00:00.000Z',
      'yyyy-MM-dd\'T\'hh:mm:ss.SSS\'Z\'',
      { zone: 'utc' }
    );
    sinon.assert.notCalled(now);
    sinon.assert.notCalled(fromJSDate);
    sinon.assert.notCalled(fromISO);
    sinon.assert.notCalled(invalid);
  });

  it('should return dateTime if too many args', () => {
    const result = CompaniDatesHelper
      ._formatMiscToCompanyDate('2021-11-24T07:00:00.000Z', 'MMMM dd yyyy', { locale: 'fr' });

    expect(result instanceof luxon.DateTime).toBe(true);
    sinon.assert.calledOnceWithExactly(invalid, 'wrong arguments');
    sinon.assert.notCalled(now);
    sinon.assert.notCalled(fromJSDate);
    sinon.assert.notCalled(fromISO);
    sinon.assert.notCalled(fromFormat);
  });
});
