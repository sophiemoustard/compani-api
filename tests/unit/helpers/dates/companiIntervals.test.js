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
    const startDateISO = '2021-11-24T08:00:00.000Z';
    const endDateISO = '2021-11-30T09:30:00.000Z';

    const luxonDate1 = luxon.DateTime.fromISO('2022-01-03T11:00:00.000Z');
    const luxonDate2 = luxon.DateTime.fromISO('2022-01-10T22:00:00.000Z');
    const luxonInterval = luxon.Interval.fromDateTimes(luxonDate1, luxonDate2);

    const companiInterval = CompaniIntervalsHelper.CompaniInterval(startDateISO, endDateISO);
    companiInterval._interval = luxonInterval;

    expect(companiInterval._getInterval.start.toUTC().toISO()).toEqual(startDateISO);
    expect(companiInterval._getInterval.end.toUTC().toISO()).toEqual(endDateISO);
  });

  describe('Constructor', () => {
    it('should return interval', () => {
      const startDateISO = '2021-11-24T08:00:00.000Z';
      const endDateISO = '2021-11-30T09:30:00.000Z';
      const result = CompaniIntervalsHelper.CompaniInterval(startDateISO, endDateISO);

      expect(result)
        .toEqual(expect.objectContaining({
          _getInterval: expect.any(luxon.Interval),
          rangeBy: expect.any(Function),
        }));
      sinon.assert.calledWithExactly(_formatMiscToCompaniInterval.getCall(0), startDateISO, endDateISO);
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
    const startDateISO = '2021-11-24T08:00:00.000Z';
    const endDateISO = '2021-11-30T09:30:00.000Z';
    const companiInterval = CompaniIntervalsHelper.CompaniInterval(startDateISO, endDateISO);
    const result = companiInterval._getInterval;

    expect(result).toEqual(expect.any(luxon.Interval));
    expect(result.start.toUTC().toISO()).toEqual(startDateISO);
    expect(result.end.toUTC().toISO()).toEqual(endDateISO);
  });
});

describe('rangeBy', () => {
  const startDateISO = '2022-02-11T09:00:00.000Z';
  const endDateISO = '2022-02-13T10:30:00.000Z';
  const interval = CompaniIntervalsHelper.CompaniInterval(startDateISO, endDateISO);

  it('should accept duration object as argument. TO BE removed after spliting "outil" from "formation"', () => {
    const result = interval.rangeBy({ days: 1 });

    expect(result).toEqual(['2022-02-11T09:00:00.000Z', '2022-02-12T09:00:00.000Z', '2022-02-13T09:00:00.000Z']);
  });

  it('should return sequence of dates, endDate is not included', () => {
    const result = interval.rangeBy('P1D');

    expect(result).toEqual(['2022-02-11T09:00:00.000Z', '2022-02-12T09:00:00.000Z', '2022-02-13T09:00:00.000Z']);
  });

  it('should return sequence of dates, endDate is the last element of the sequence', () => {
    const otherEndDateISO = '2022-02-13T09:00:00.000Z';
    const otherInterval = CompaniIntervalsHelper.CompaniInterval(startDateISO, otherEndDateISO);
    const result = otherInterval.rangeBy('P1D');

    expect(result).toEqual(['2022-02-11T09:00:00.000Z', '2022-02-12T09:00:00.000Z', '2022-02-13T09:00:00.000Z']);
  });

  it('should return sequence of dates, last element is excluded', () => {
    const result = interval.rangeBy('P1D', true);

    expect(result).toEqual(['2022-02-11T09:00:00.000Z', '2022-02-12T09:00:00.000Z']);
  });

  it('should return sequence of dates, step is not 1', () => {
    const result = interval.rangeBy('P1.5D');

    expect(result).toEqual(['2022-02-11T09:00:00.000Z', '2022-02-12T21:00:00.000Z']);
  });

  it('should return error if duration is zero', () => {
    try {
      interval.rangeBy('PT0S');
    } catch (e) {
      expect(e).toEqual(new Error('invalid argument : duration is zero'));
    }
  });
});

describe('newRangeBy', () => {
  it('should return sequence of dates, endDate is not included', () => {
    const interval = CompaniIntervalsHelper.CompaniInterval('2022-02-11T09:00:00.000Z', '2022-02-13T10:30:00.000Z');
    const result = interval.newRangeBy('P1D');

    expect(result).toEqual(['2022-02-11T09:00:00.000Z', '2022-02-12T09:00:00.000Z', '2022-02-13T09:00:00.000Z']);
  });

  it('should return sequence of dates (step is 1 day), endDate is the last element of the sequence', () => {
    const interval = CompaniIntervalsHelper.CompaniInterval('2022-02-11T09:00:00.000Z', '2022-02-13T09:00:00.000Z');
    const result = interval.newRangeBy('P1D');

    expect(result).toEqual(['2022-02-11T09:00:00.000Z', '2022-02-12T09:00:00.000Z', '2022-02-13T09:00:00.000Z']);
  });

  it('should return sequence of dates (step is 1 month), endDate is the last element of the sequence,', () => {
    const interval = CompaniIntervalsHelper.CompaniInterval(
      '2022-01-03T10:00:00.000+01:00',
      '2022-05-03T10:00:00.000+02:00'
    );
    const result = interval.newRangeBy('P1M');

    expect(result).toEqual([
      '2022-01-03T09:00:00.000Z',
      '2022-02-03T09:00:00.000Z',
      '2022-03-03T09:00:00.000Z',
      '2022-04-03T08:00:00.000Z', // time shifts from winter to summer
      '2022-05-03T08:00:00.000Z',
    ]);
  });

  it('should return error if duration is zero', () => {
    try {
      const interval = CompaniIntervalsHelper.CompaniInterval('2022-02-11T09:00:00.000Z', '2022-02-13T10:30:00.000Z');
      interval.newRangeBy('PT0S');
    } catch (e) {
      expect(e).toEqual(new Error('invalid argument : duration is zero'));
    }
  });
});

describe('_formatMiscToCompaniInterval', () => {
  let datefromISO;
  let intervalInvalid;
  const intervalISO = '2021-11-24T09:00:00.000+01:00/2021-11-30T10:30:00.000+01:00';
  const interval = luxon.Interval.fromISO(intervalISO);

  beforeEach(() => {
    datefromISO = sinon.spy(luxon.DateTime, 'fromISO');
    intervalInvalid = sinon.spy(luxon.Interval, 'invalid');
  });

  afterEach(() => {
    datefromISO.restore();
    intervalInvalid.restore();
  });

  it('should return interval if arg is instance CompaniInterval', () => {
    const payload = { _getInterval: interval };
    const result = CompaniIntervalsHelper._formatMiscToCompaniInterval(payload);

    expect(result instanceof luxon.Interval).toBe(true);
    expect(new luxon.Interval(result).toISO()).toEqual(intervalISO);
    sinon.assert.notCalled(datefromISO);
    sinon.assert.notCalled(intervalInvalid);
  });

  it('should return interval if 2 args, 2 dates of type ISO string', () => {
    const coupleOfDateISO = ['2021-11-24T08:00:00.000Z', '2021-11-30T09:30:00.000Z'];
    const result = CompaniIntervalsHelper._formatMiscToCompaniInterval(...coupleOfDateISO);

    expect(result instanceof luxon.Interval).toBe(true);
    expect(new luxon.Interval(result).toISO()).toEqual(intervalISO);
    sinon.assert.calledTwice(datefromISO);
    sinon.assert.calledWithExactly(datefromISO.getCall(0), coupleOfDateISO[0]);
    sinon.assert.calledWithExactly(datefromISO.getCall(1), coupleOfDateISO[1]);
    sinon.assert.notCalled(intervalInvalid);
  });

  it('should return error if endDate is before startDate', () => {
    const startDateISO = '2021-11-24T08:00:00.000Z';
    const endDateISO = '2021-11-30T09:30:00.000Z';
    try {
      CompaniIntervalsHelper._formatMiscToCompaniInterval(startDateISO, endDateISO);
    } catch (e) {
      expect(e).toEqual(new Error('Invalid Interval: end before start: The end of an interval must be after '
        + 'its start, but you had start=2021-11-24T09:00:00.000+01:00 and end=2021-11-20T10:30:00.000+01:00'));
    } finally {
      sinon.assert.calledTwice(datefromISO);
      sinon.assert.calledWithExactly(datefromISO.getCall(0), startDateISO);
      sinon.assert.calledWithExactly(datefromISO.getCall(1), endDateISO);
      sinon.assert.notCalled(intervalInvalid);
    }
  });

  it('should return error if no arg', () => {
    try {
      CompaniIntervalsHelper._formatMiscToCompaniInterval();
    } catch (e) {
      expect(e).toEqual(new Error('Invalid Interval: wrong arguments'));
    } finally {
      sinon.assert.notCalled(datefromISO);
      sinon.assert.calledOnceWithExactly(intervalInvalid, 'wrong arguments');
    }
  });

  it('should return error if arg is interval of type ISO string', () => {
    try {
      const payload = '2022-02-11T09:00:00.000+01:00/2022-03-15T10:00:00.000+01:00';
      CompaniIntervalsHelper._formatMiscToCompaniInterval(payload);
    } catch (e) {
      expect(e).toEqual(new Error('Invalid Interval: wrong arguments'));
    } finally {
      sinon.assert.notCalled(datefromISO);
      sinon.assert.calledOnceWithExactly(intervalInvalid, 'wrong arguments');
    }
  });

  it('should return error if 2 args of type DateTime', () => {
    const companiStartDate = CompaniDatesHelper.CompaniDate('2021-11-24T09:00:00.000+01:00');
    const companiEndDate = CompaniDatesHelper.CompaniDate('2021-11-30T10:30:00.000+01:00');
    try {
      CompaniIntervalsHelper._formatMiscToCompaniInterval(companiStartDate, companiEndDate);
    } catch (e) {
      expect(e).toEqual(new Error('Invalid Interval: wrong arguments'));
    } finally {
      sinon.assert.calledOnceWithExactly(intervalInvalid, 'wrong arguments');
    }
  });

  it('should return error if arg is luxon.Interval', () => {
    try {
      const payload = interval;
      CompaniIntervalsHelper._formatMiscToCompaniInterval(payload);
    } catch (e) {
      expect(e).toEqual(new Error('Invalid Interval: wrong arguments'));
    } finally {
      sinon.assert.notCalled(datefromISO);
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
      sinon.assert.calledOnceWithExactly(intervalInvalid, 'wrong arguments');
    }
  });
});
