const expect = require('expect');
const luxon = require('luxon');
const sinon = require('sinon');
const CompaniDatesHelper = require('../../../src/helpers/companiDates');

describe('CompaniDate', () => {
  let _formatMiscToCompanyDate;

  beforeEach(() => {
    _formatMiscToCompanyDate = sinon.spy(CompaniDatesHelper, '_formatMiscToCompanyDate');
  });

  afterEach(() => {
    _formatMiscToCompanyDate.restore();
  });

  it('should return dateTime', () => {
    const date = new Date('2021-11-24T07:00:00.000Z');

    const result = CompaniDatesHelper.CompaniDate(date);

    expect(result)
      .toEqual(expect.objectContaining({ _date: expect.any(luxon.DateTime), isSame: expect.any(Function) }));
    sinon.assert.calledWithExactly(_formatMiscToCompanyDate.getCall(0), date);
  });
});

describe('isSame', () => {
  let _formatMiscToCompanyDate;
  const companiDate = CompaniDatesHelper.CompaniDate('2021-11-24T07:00:00.000Z');
  const otherDate = new Date('2021-11-24T10:00:00.000Z');

  beforeEach(() => {
    _formatMiscToCompanyDate = sinon.spy(CompaniDatesHelper, '_formatMiscToCompanyDate');
  });

  afterEach(() => {
    _formatMiscToCompanyDate.restore();
  });

  it('should return true if same day', () => {
    const result = companiDate.isSame(otherDate, 'day');

    expect(result).toBe(true);
    sinon.assert.calledWithExactly(_formatMiscToCompanyDate.getCall(0), otherDate);
  });

  it('should return false if different minute', () => {
    const result = companiDate.isSame(otherDate, 'minute');

    expect(result).toBe(false);
    sinon.assert.calledWithExactly(_formatMiscToCompanyDate.getCall(0), otherDate);
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

  it('should return dateTime if arg is object with dateTime', () => {
    const payload = { _date: date };
    const result = CompaniDatesHelper._formatMiscToCompanyDate(payload);

    expect(result instanceof luxon.DateTime).toBe(true);
    expect(new luxon.DateTime(result).toJSDate()).toEqual(new Date('2021-11-24T07:00:00.000Z'));
    sinon.assert.notCalled(now);
    sinon.assert.notCalled(fromJSDate);
    sinon.assert.notCalled(fromISO);
    sinon.assert.notCalled(fromFormat);
    sinon.assert.notCalled(invalid);
  });

  it('should return dateTime if arg is dateTime', () => {
    const payload = date;
    const result = CompaniDatesHelper._formatMiscToCompanyDate(payload);

    expect(result instanceof luxon.DateTime).toBe(true);
    expect(new luxon.DateTime(result).toJSDate()).toEqual(new Date('2021-11-24T07:00:00.000Z'));
    sinon.assert.notCalled(now);
    sinon.assert.notCalled(fromJSDate);
    sinon.assert.notCalled(fromISO);
    sinon.assert.notCalled(fromFormat);
    sinon.assert.notCalled(invalid);
  });

  it('should return dateTime if arg is date', () => {
    const payload = new Date('2021-11-24T07:00:00.000Z');
    const result = CompaniDatesHelper._formatMiscToCompanyDate(payload);

    expect(result instanceof luxon.DateTime).toBe(true);
    expect(new luxon.DateTime(result).toJSDate()).toEqual(new Date('2021-11-24T07:00:00.000Z'));
    sinon.assert.calledOnceWithExactly(fromJSDate, payload);
    sinon.assert.notCalled(now);
    sinon.assert.notCalled(fromISO);
    sinon.assert.notCalled(fromFormat);
    sinon.assert.notCalled(invalid);
  });

  it('should return dateTime if arg is string', () => {
    const payload = '2021-11-24T07:00:00.000Z';
    const result = CompaniDatesHelper._formatMiscToCompanyDate(payload);

    expect(result instanceof luxon.DateTime).toBe(true);
    expect(new luxon.DateTime(result).toJSDate()).toEqual(new Date('2021-11-24T07:00:00.000Z'));
    sinon.assert.calledOnceWithExactly(fromISO, payload);
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

  it('should return invalid if too many args', () => {
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
