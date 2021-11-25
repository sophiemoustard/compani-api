const expect = require('expect');
const luxon = require('luxon');
const sinon = require('sinon');
const CompaniDatesHelper = require('../../../src/helpers/companiDates');

describe('isSame', () => {
  let _instantiateDateTimeFromMisc;
  const date = new Date('2021-11-24T07:00:00.000Z');
  const otherDate = new Date('2021-11-24T10:00:00.000Z');

  beforeEach(() => {
    _instantiateDateTimeFromMisc = sinon.stub(CompaniDatesHelper, '_instantiateDateTimeFromMisc');
  });

  afterEach(() => {
    _instantiateDateTimeFromMisc.restore();
  });

  it('should return true if same day', () => {
    _instantiateDateTimeFromMisc.onCall(0).returns(luxon.DateTime.fromJSDate(date));
    _instantiateDateTimeFromMisc.onCall(1).returns(luxon.DateTime.fromJSDate(otherDate));

    const result = CompaniDatesHelper.CompaniDate(date).isSame(otherDate, 'day');

    expect(result).toBe(true);
    sinon.assert.calledWithExactly(_instantiateDateTimeFromMisc.getCall(0), date);
    sinon.assert.calledWithExactly(_instantiateDateTimeFromMisc.getCall(1), otherDate);
  });

  it('should return false if different minute', () => {
    _instantiateDateTimeFromMisc.onCall(0).returns(luxon.DateTime.fromJSDate(date));
    _instantiateDateTimeFromMisc.onCall(1).returns(luxon.DateTime.fromJSDate(otherDate));

    const result = CompaniDatesHelper.CompaniDate(date).isSame(otherDate, 'minute');

    expect(result).toBe(false);
    sinon.assert.calledWithExactly(_instantiateDateTimeFromMisc.getCall(0), date);
    sinon.assert.calledWithExactly(_instantiateDateTimeFromMisc.getCall(1), otherDate);
  });
});

describe('_instantiateDateTimeFromMisc', () => {
  let now;
  let fromJSDate;
  let fromISO;
  let fromFormat;
  let invalid;
  const date = new luxon.DateTime('');

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
    now.returns(date);

    const result = CompaniDatesHelper._instantiateDateTimeFromMisc();

    expect(result).toMatchObject(date);
    sinon.assert.calledOnceWithExactly(now);
    sinon.assert.notCalled(fromJSDate);
    sinon.assert.notCalled(fromISO);
    sinon.assert.notCalled(fromFormat);
    sinon.assert.notCalled(invalid);
  });

  const dates = [
    { type: 'object with dateTime', date: { _date: date } },
    { type: 'dateTime', date },
    { type: 'date', date: new Date() },
    { type: 'string', date: '2021-11-24T07:00:00.000Z' },
  ];
  it(`should return dateTime if arg is ${dates[0].type}`, () => {
    const result = CompaniDatesHelper._instantiateDateTimeFromMisc(dates[0].date);

    expect(result).toMatchObject(dates[0].date._date);
    sinon.assert.notCalled(now);
    sinon.assert.notCalled(fromJSDate);
    sinon.assert.notCalled(fromISO);
    sinon.assert.notCalled(fromFormat);
    sinon.assert.notCalled(invalid);
  });

  it(`should return dateTime if arg is ${dates[1].type}`, () => {
    const result = CompaniDatesHelper._instantiateDateTimeFromMisc(dates[1].date);

    expect(result).toMatchObject(dates[1].date);
    sinon.assert.notCalled(now);
    sinon.assert.notCalled(fromJSDate);
    sinon.assert.notCalled(fromISO);
    sinon.assert.notCalled(fromFormat);
    sinon.assert.notCalled(invalid);
  });

  it(`should return dateTime if arg is ${dates[2].type}`, () => {
    fromJSDate.returns(date);

    const result = CompaniDatesHelper._instantiateDateTimeFromMisc(dates[2].date);

    expect(result).toMatchObject(date);
    sinon.assert.calledOnceWithExactly(fromJSDate, dates[2].date);
    sinon.assert.notCalled(now);
    sinon.assert.notCalled(fromISO);
    sinon.assert.notCalled(fromFormat);
    sinon.assert.notCalled(invalid);
  });

  it(`should return dateTime if arg is ${dates[3].type}`, () => {
    fromISO.returns(date);

    const result = CompaniDatesHelper._instantiateDateTimeFromMisc(dates[3].date);

    expect(result).toMatchObject(date);
    sinon.assert.calledOnceWithExactly(fromISO, dates[3].date);
    sinon.assert.notCalled(now);
    sinon.assert.notCalled(fromJSDate);
    sinon.assert.notCalled(fromFormat);
    sinon.assert.notCalled(invalid);
  });

  it('should return dateTime if 2 args', () => {
    fromFormat.returns(date);

    const result = CompaniDatesHelper._instantiateDateTimeFromMisc('2021-11-24T07:00:00.000Z', 'MMMM dd yyyy');

    expect(result).toMatchObject(date);
    sinon.assert.calledOnceWithExactly(fromFormat, '2021-11-24T07:00:00.000Z', 'MMMM dd yyyy');
    sinon.assert.notCalled(now);
    sinon.assert.notCalled(fromJSDate);
    sinon.assert.notCalled(fromISO);
    sinon.assert.notCalled(invalid);
  });

  it('should return dateTime if too many args', () => {
    invalid.returns({ invalid: { reason: 'wrong arguments', explanation: null } });

    const result = CompaniDatesHelper
      ._instantiateDateTimeFromMisc('2021-11-24T07:00:00.000Z', 'MMMM dd yyyy', { locale: 'fr' });

    expect(result).toMatchObject({ invalid: { reason: 'wrong arguments', explanation: null } });
    sinon.assert.calledOnceWithExactly(invalid, 'wrong arguments');
    sinon.assert.notCalled(now);
    sinon.assert.notCalled(fromJSDate);
    sinon.assert.notCalled(fromISO);
    sinon.assert.notCalled(fromFormat);
  });
});
