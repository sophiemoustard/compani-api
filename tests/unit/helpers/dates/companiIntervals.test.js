const expect = require('expect');
const sinon = require('sinon');
const luxon = require('../../../../src/helpers/dates/luxon');
const CompaniIntervalsHelper = require('../../../../src/helpers/dates/companiIntervals');
const CompaniDatesHelper = require('../../../../src/helpers/dates/companiDates');

describe('CompaniInterval', () => {
  let _formatMiscToCompaniInterval;

  beforeEach(() => {
    _formatMiscToCompaniInterval = sinon.spy(CompaniIntervalsHelper, '_formatMiscToCompaniInterval');
  });

  afterEach(() => {
    _formatMiscToCompaniInterval.restore();
  });

  it('should not mutate _interval', () => {
    const intervalISO = '2021-11-24T09:00:00.000+01:00/2021-11-30T10:30:00.000+01:00';
    const otherIntervalISO = '2022-01-03T12:00:00.000+01:00/2022-01-10T23:00:00.000+01:00';
    const companiInterval = CompaniIntervalsHelper.CompaniInterval(intervalISO);
    companiInterval._interval = luxon.Interval.fromISO(otherIntervalISO);

    expect(companiInterval._getInterval.toISO()).toEqual(intervalISO);
  });

  describe('Constructor', () => {
    it('should return interval', () => {
      const intervalISO = '2021-11-24T08:00:00.000Z/2021-11-30T09:30:00.000Z';
      const result = CompaniIntervalsHelper.CompaniInterval(intervalISO);

      expect(result)
        .toEqual(expect.objectContaining({
          _getInterval: expect.any(luxon.Interval),
          rangeBy: expect.any(Function),
        }));
      sinon.assert.calledWithExactly(_formatMiscToCompaniInterval.getCall(0), intervalISO);
    });

    it('should return error if endDate is before startDate', () => {
      const intervalISO = '2021-11-24T08:00:00.000Z/2021-11-20T09:30:00.000Z';
      try {
        CompaniIntervalsHelper.CompaniInterval(intervalISO);
      } catch (e) {
        expect(e).toEqual(new Error('Invalid Interval: end before start: The end of an interval must be after '
          + 'its start, but you had start=2021-11-24T09:00:00.000+01:00 and end=2021-11-20T10:30:00.000+01:00'));
      } finally {
        sinon.assert.calledOnceWithExactly(_formatMiscToCompaniInterval, intervalISO);
      }
    });

    it('should return error if invalid argument', () => {
      try {
        CompaniIntervalsHelper.CompaniInterval(null);
      } catch (e) {
        expect(e).toEqual(new Error('Invalid Interval: wrong arguments'));
      } finally {
        sinon.assert.calledOnceWithExactly(_formatMiscToCompaniInterval, null);
      }
    });
  });
});

describe('getInterval', () => {
  it('should return _interval', () => {
    const intervalISO = '2021-11-24T09:00:00.000+01:00/2021-11-30T10:30:00.000+01:00';
    const companiInterval = CompaniIntervalsHelper.CompaniInterval(intervalISO);
    const result = companiInterval._getInterval;

    expect(result).toEqual(expect.any(luxon.Interval));
    expect(result).toEqual(luxon.Interval.fromISO(intervalISO));
  });
});

describe('rangeBy', () => {
  const interval = CompaniIntervalsHelper.CompaniInterval('2022-02-11T09:00:00.000Z/2022-02-13T10:30:00.000Z');

  it('should return sequence of dates, endDate is not included', () => {
    const result = interval.rangeBy({ days: 1 });

    expect(result).toEqual(['2022-02-11T09:00:00.000Z', '2022-02-12T09:00:00.000Z', '2022-02-13T09:00:00.000Z']);
  });

  it('should return sequence of dates, endDate is the last element of the sequence', () => {
    const otherInterval = CompaniIntervalsHelper.CompaniInterval('2022-02-11T09:00:00.000Z/2022-02-13T09:00:00.000Z');
    const result = otherInterval.rangeBy({ days: 1 });

    expect(result).toEqual(['2022-02-11T09:00:00.000Z', '2022-02-12T09:00:00.000Z', '2022-02-13T09:00:00.000Z']);
  });

  it('should return sequence of dates, last element is excluded', () => {
    const result = interval.rangeBy({ days: 1 }, true);

    expect(result).toEqual(['2022-02-11T09:00:00.000Z', '2022-02-12T09:00:00.000Z']);
  });

  it('should return sequence of dates, step is not 1', () => {
    const result = interval.rangeBy({ days: 1.5 });

    expect(result).toEqual(['2022-02-11T09:00:00.000Z', '2022-02-12T21:00:00.000Z']);
  });

  it('should return error if duration is zero', () => {
    try {
      interval.rangeBy({});
    } catch (e) {
      expect(e).toEqual(new Error('invalid argument : duration is zero'));
    }
  });
});

describe('_formatMiscToCompaniInterval', () => {
  let datefromISO;
  let intervalfromISO;
  let intervalFromDateTimes;
  let intervalInvalid;
  const intervalISO = '2021-11-24T09:00:00.000+01:00/2021-11-30T10:30:00.000+01:00';
  const interval = luxon.Interval.fromISO(intervalISO);
  const luxonStartDate = luxon.DateTime.fromISO('2021-11-24T09:00:00.000+01:00');
  const luxonEndDate = luxon.DateTime.fromISO('2021-11-30T10:30:00.000+01:00');
  const companiStartDate = CompaniDatesHelper.CompaniDate('2021-11-24T09:00:00.000+01:00');
  const companiEndDate = CompaniDatesHelper.CompaniDate('2021-11-30T10:30:00.000+01:00');

  beforeEach(() => {
    datefromISO = sinon.spy(luxon.DateTime, 'fromISO');
    intervalfromISO = sinon.spy(luxon.Interval, 'fromISO');
    intervalFromDateTimes = sinon.spy(luxon.Interval, 'fromDateTimes');
    intervalInvalid = sinon.spy(luxon.Interval, 'invalid');
  });

  afterEach(() => {
    datefromISO.restore();
    intervalfromISO.restore();
    intervalFromDateTimes.restore();
    intervalInvalid.restore();
  });

  it('should return error if no arg', () => {
    try {
      CompaniIntervalsHelper._formatMiscToCompaniInterval();
    } catch (e) {
      expect(e).toEqual(new Error('Invalid Interval: wrong arguments'));
    } finally {
      sinon.assert.notCalled(datefromISO);
      sinon.assert.notCalled(intervalfromISO);
      sinon.assert.notCalled(intervalFromDateTimes);
      sinon.assert.calledOnceWithExactly(intervalInvalid, 'wrong arguments');
    }
  });

  it('should return interval if arg is object with interval', () => {
    const payload = { _getInterval: interval };
    const result = CompaniIntervalsHelper._formatMiscToCompaniInterval(payload);

    expect(result instanceof luxon.Interval).toBe(true);
    expect(new luxon.Interval(result).toISO()).toEqual(intervalISO);
    sinon.assert.notCalled(datefromISO);
    sinon.assert.notCalled(intervalfromISO);
    sinon.assert.notCalled(intervalFromDateTimes);
    sinon.assert.notCalled(intervalInvalid);
  });

  it('should return interval if arg is string', () => {
    const payload = '2022-02-11T09:00:00.000+01:00/2022-03-15T10:00:00.000+01:00';
    const result = CompaniIntervalsHelper._formatMiscToCompaniInterval(payload);

    expect(result instanceof luxon.Interval).toBe(true);
    expect(new luxon.Interval(result).toISO()).toEqual('2022-02-11T09:00:00.000+01:00/2022-03-15T10:00:00.000+01:00');
    sinon.assert.calledTwice(datefromISO); // called by luxon
    sinon.assert.calledOnceWithExactly(intervalfromISO, payload);
    sinon.assert.calledOnce(intervalFromDateTimes); // called by luxon
    sinon.assert.notCalled(intervalInvalid);
  });

  it('should return error if arg is empty string', () => {
    try {
      CompaniIntervalsHelper._formatMiscToCompaniInterval('');
    } catch (e) {
      expect(e).toEqual(new Error('Invalid Interval: wrong arguments'));
    } finally {
      sinon.assert.notCalled(datefromISO);
      sinon.assert.notCalled(intervalfromISO);
      sinon.assert.notCalled(intervalFromDateTimes);
      sinon.assert.calledOnceWithExactly(intervalInvalid, 'wrong arguments');
    }
  });

  it('should return interval if 2 args of type string', () => {
    const coupleOfDateISO = ['2021-11-24T08:00:00.000Z', '2021-11-30T09:30:00.000Z'];
    const result = CompaniIntervalsHelper._formatMiscToCompaniInterval(...coupleOfDateISO);

    expect(result instanceof luxon.Interval).toBe(true);
    expect(new luxon.Interval(result).toISO()).toEqual(intervalISO);
    sinon.assert.calledOnceWithExactly(intervalFromDateTimes, luxonStartDate, luxonEndDate);
    sinon.assert.calledTwice(datefromISO);
    sinon.assert.calledWithExactly(datefromISO.getCall(0), coupleOfDateISO[0]);
    sinon.assert.calledWithExactly(datefromISO.getCall(1), coupleOfDateISO[1]);
    sinon.assert.notCalled(intervalfromISO);
    sinon.assert.notCalled(intervalInvalid);
  });

  it('should return interval if 2 args of type DateTime', () => {
    const result = CompaniIntervalsHelper._formatMiscToCompaniInterval(companiStartDate, companiEndDate);

    expect(result instanceof luxon.Interval).toBe(true);
    expect(new luxon.Interval(result).toISO()).toEqual(intervalISO);
    sinon.assert.notCalled(datefromISO);
    sinon.assert.notCalled(intervalfromISO);
    sinon.assert.calledOnceWithExactly(intervalFromDateTimes, luxonStartDate, luxonEndDate);
    sinon.assert.notCalled(intervalInvalid);
  });

  it('should return error if arg is luxon.Interval', () => {
    try {
      const payload = interval;
      CompaniIntervalsHelper._formatMiscToCompaniInterval(payload);
    } catch (e) {
      expect(e).toEqual(new Error('Invalid Interval: wrong arguments'));
    } finally {
      sinon.assert.notCalled(datefromISO);
      sinon.assert.notCalled(intervalfromISO);
      sinon.assert.notCalled(intervalFromDateTimes);
      sinon.assert.calledOnceWithExactly(intervalInvalid, 'wrong arguments');
    }
  });

  it('should return error if invalid type of argument', () => {
    try {
      CompaniIntervalsHelper._formatMiscToCompaniInterval(null);
    } catch (e) {
      expect(e).toEqual(new Error('Invalid Interval: wrong arguments'));
    } finally {
      sinon.assert.notCalled(datefromISO);
      sinon.assert.notCalled(intervalfromISO);
      sinon.assert.notCalled(intervalFromDateTimes);
      sinon.assert.calledOnceWithExactly(intervalInvalid, 'wrong arguments');
    }
  });
});
