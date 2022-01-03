const expect = require('expect');
const sinon = require('sinon');
const luxon = require('../../../../src/helpers/dates/luxon');
const CompaniDatesHelper = require('../../../../src/helpers/dates/companiDates');

describe('CompaniDate', () => {
  let _formatMiscToCompaniDate;

  beforeEach(() => {
    _formatMiscToCompaniDate = sinon.spy(CompaniDatesHelper, '_formatMiscToCompaniDate');
  });

  afterEach(() => {
    _formatMiscToCompaniDate.restore();
  });

  it('should return dateTime', () => {
    const date = '2021-11-24T07:00:00.000Z';

    const result = CompaniDatesHelper.CompaniDate(date);

    expect(result)
      .toEqual(expect.objectContaining({
        _getDate: expect.any(luxon.DateTime),
        getUnits: expect.any(Function),
        format: expect.any(Function),
        toDate: expect.any(Function),
        toISO: expect.any(Function),
        isBefore: expect.any(Function),
        isAfter: expect.any(Function),
        isSame: expect.any(Function),
        isSameOrBefore: expect.any(Function),
        startOf: expect.any(Function),
        endOf: expect.any(Function),
        diff: expect.any(Function),
        add: expect.any(Function),
        set: expect.any(Function),
      }));
    sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, date);
  });

  it('should return error if invalid argument', () => {
    try {
      CompaniDatesHelper.CompaniDate(null);
    } catch (e) {
      expect(e).toEqual(new Error('Invalid DateTime: wrong arguments'));
    } finally {
      sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, null);
    }
  });
});

describe('GETTER', () => {
  describe('getDate', () => {
    it('should return _date', () => {
      const companiDate = CompaniDatesHelper.CompaniDate('2021-11-24T07:12:08.000Z');
      const result = companiDate._getDate;

      expect(result).toEqual(expect.any(luxon.DateTime));
      expect(result).toEqual(luxon.DateTime.fromISO('2021-11-24T07:12:08.000Z'));
    });

    it('should not mutate _date', () => {
      const isoDate = '2021-11-24T07:12:08.000Z';
      const otherIsoDate = '2022-01-03T07:12:08.000Z';
      const companiDate = CompaniDatesHelper.CompaniDate(isoDate);
      companiDate._date = luxon.DateTime.fromISO(otherIsoDate);

      expect(companiDate._getDate.toUTC().toISO()).toEqual(isoDate);
    });
  });

  describe('getUnits', () => {
    it('should return units', () => {
      const companiDate = CompaniDatesHelper.CompaniDate('2021-11-24T07:12:08.000Z');
      const result = companiDate.getUnits(['day', 'second']);

      expect(result).toEqual({ day: 24, second: 8 });
    });

    it('should return only valid units', () => {
      const companiDate = CompaniDatesHelper.CompaniDate('2021-11-24T07:12:08.000Z');
      const result = companiDate.getUnits(['days', 'second', 'mois']);

      expect(result).toEqual({ second: 8 });
    });
  });
});

describe('DISPLAY', () => {
  describe('format', () => {
    it('should return formated date in a string', () => {
      const companiDate = CompaniDatesHelper.CompaniDate('2021-11-24T07:12:08.000Z');
      const result = companiDate.format('\'Le\' cccc dd LLLL y \'à\' HH\'h\'mm \'et\' s \'secondes\'');

      expect(result).toBe('Le mercredi 24 novembre 2021 à 08h12 et 8 secondes');
    });
  });

  describe('toDate', () => {
    const companiDate = CompaniDatesHelper.CompaniDate('2021-11-24T07:00:00.000+01:00');

    it('should return a JSDate equivalent to companiDate (in utc)', () => {
      const result = companiDate.toDate();

      expect(result).toEqual(new Date('2021-11-24T06:00:00.000Z'));
    });
  });

  describe('toISO', () => {
    const companiDate = CompaniDatesHelper.CompaniDate('2021-12-24T12:00:00.000+03:00');

    it('should return a string ISO 8601 equivalent to companiDate (in utc)', () => {
      const result = companiDate.toISO();

      expect(result).toEqual('2021-12-24T09:00:00.000Z');
    });
  });
});

describe('QUERY', () => {
  describe('isBefore', () => {
    let _formatMiscToCompaniDate;
    let otherDate = '2021-11-01T10:00:00.000Z';
    const companiDate = CompaniDatesHelper.CompaniDate('2021-11-01T07:00:00.000Z');

    beforeEach(() => {
      _formatMiscToCompaniDate = sinon.spy(CompaniDatesHelper, '_formatMiscToCompaniDate');
    });

    afterEach(() => {
      _formatMiscToCompaniDate.restore();
    });

    it('should return true if date is before other date', () => {
      const result = companiDate.isBefore(otherDate);

      expect(result).toBe(true);
      sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
    });

    it('should return false is date is not before other date', () => {
      otherDate = '2021-11-01T05:00:00.000Z';
      const result = companiDate.isBefore(otherDate);

      expect(result).toBe(false);
      sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
    });

    it('should return error if invalid other date', () => {
      try {
        companiDate.isBefore(null);
      } catch (e) {
        expect(e).toEqual(new Error('Invalid DateTime: wrong arguments'));
      } finally {
        sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, null);
      }
    });
  });

  describe('isAfter', () => {
    let _formatMiscToCompaniDate;
    let otherDate = '2021-11-01T05:00:00.000Z';
    const companiDate = CompaniDatesHelper.CompaniDate('2021-11-01T07:00:00.000Z');

    beforeEach(() => {
      _formatMiscToCompaniDate = sinon.spy(CompaniDatesHelper, '_formatMiscToCompaniDate');
    });

    afterEach(() => {
      _formatMiscToCompaniDate.restore();
    });

    it('should return true if date is after other date', () => {
      const result = companiDate.isAfter(otherDate);

      expect(result).toBe(true);
      sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
    });

    it('should return false is date is not after other date', () => {
      otherDate = '2021-11-01T10:00:00.000Z';
      const result = companiDate.isAfter(otherDate);

      expect(result).toBe(false);
      sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
    });

    it('should return error if invalid dateAfter', () => {
      try {
        companiDate.isAfter(null);
      } catch (e) {
        expect(e).toEqual(new Error('Invalid DateTime: wrong arguments'));
      } finally {
        sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, null);
      }
    });
  });

  describe('isSame', () => {
    let _formatMiscToCompaniDate;
    const companiDate = CompaniDatesHelper.CompaniDate('2021-11-24T07:00:00.000Z');
    const otherDate = '2021-11-24T10:00:00.000Z';

    beforeEach(() => {
      _formatMiscToCompaniDate = sinon.spy(CompaniDatesHelper, '_formatMiscToCompaniDate');
    });

    afterEach(() => {
      _formatMiscToCompaniDate.restore();
    });

    it('should return true if same day', () => {
      const result = companiDate.isSame(otherDate, 'day');

      expect(result).toBe(true);
      sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
    });

    it('should return false if different minute', () => {
      const result = companiDate.isSame(otherDate, 'minute');

      expect(result).toBe(false);
      sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
    });

    it('should return error if invalid other date', () => {
      try {
        companiDate.isSame(null, 'day');
      } catch (e) {
        expect(e).toEqual(new Error('Invalid DateTime: wrong arguments'));
      } finally {
        sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, null);
      }
    });

    it('should return error if unit is plural', () => {
      try {
        companiDate.isSame(otherDate, 'days');
      } catch (e) {
        expect(e).toEqual(new Error('Invalid unit days'));
      } finally {
        sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
      }
    });
  });

  describe('isSameOrBefore', () => {
    let _formatMiscToCompaniDate;
    const companiDate = CompaniDatesHelper.CompaniDate('2021-11-24T07:00:00.000Z');
    let otherDate = '2021-11-25T10:00:00.000Z';

    beforeEach(() => {
      _formatMiscToCompaniDate = sinon.spy(CompaniDatesHelper, '_formatMiscToCompaniDate');
    });

    afterEach(() => {
      _formatMiscToCompaniDate.restore();
    });

    it('should return true if same moment', () => {
      otherDate = '2021-11-24T07:00:00.000Z';

      const result = companiDate.isSameOrBefore(otherDate);

      expect(result).toBe(true);
      sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
    });

    it('should return true if before', () => {
      const result = companiDate.isSameOrBefore(otherDate);

      expect(result).toBe(true);
      sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
    });

    it('should return true if after but same as specified unit', () => {
      otherDate = '2021-11-24T06:00:00.000Z';

      const result = companiDate.isSameOrBefore(otherDate, 'day');

      expect(result).toBe(true);
      sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
    });

    it('should return false if after', () => {
      otherDate = '2021-11-23T10:00:00.000Z';

      const result = companiDate.isSameOrBefore(otherDate);

      expect(result).toBe(false);
      sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
    });

    it('should return false if after specified unit', () => {
      otherDate = '2021-11-24T06:00:00.000Z';

      const result = companiDate.isSameOrBefore(otherDate, 'minute');

      expect(result).toBe(false);
      sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
    });

    it('should return error if invalid otherDate', () => {
      try {
        companiDate.isSameOrBefore(null);
      } catch (e) {
        expect(e).toEqual(new Error('Invalid DateTime: wrong arguments'));
      } finally {
        sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, null);
      }
    });

    it('should return error if unit is plural', () => {
      try {
        companiDate.isSame(otherDate, 'minutes');
      } catch (e) {
        expect(e).toEqual(new Error('Invalid unit minutes'));
      } finally {
        sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
      }
    });
  });
});

describe('MANIPULATE', () => {
  describe('startOf', () => {
    const companiDate = CompaniDatesHelper.CompaniDate('2021-11-19T07:00:00.000Z');

    it('should return newly constructed CompaniDate from date, setted to the beginning of the day', () => {
      const result = companiDate.startOf('day');

      expect(result).toEqual(expect.objectContaining({ _getDate: expect.any(luxon.DateTime) }));
      expect(result._getDate.toUTC().toISO()).toEqual('2021-11-18T23:00:00.000Z');

      const didNotMutate = companiDate._getDate.toUTC().toISO() === '2021-11-19T07:00:00.000Z';
      expect(didNotMutate).toEqual(true);
    });

    it('should return start of day even if unit is plural. NB: not best practice, TS refuses plural', () => {
      const result = companiDate.startOf('days');

      expect(result).toEqual(expect.objectContaining({ _getDate: expect.any(luxon.DateTime) }));
      expect(result._getDate.toUTC().toISO()).toEqual('2021-11-18T23:00:00.000Z');
    });

    it('should return error if invalid unit', () => {
      try {
        companiDate.startOf('jour');
      } catch (e) {
        expect(e).toEqual(new Error('Invalid unit jour'));
      }
    });
  });

  describe('endOf', () => {
    const companiDate = CompaniDatesHelper.CompaniDate('2021-11-19T07:00:00.000Z');

    it('should return newly constructed CompaniDate from date, setted to the end of the month', () => {
      const result = companiDate.endOf('month');

      expect(result).toEqual(expect.objectContaining({ _getDate: expect.any(luxon.DateTime) }));
      expect(result._getDate.toUTC().toISO()).toEqual('2021-11-30T22:59:59.999Z');

      const didNotMutate = companiDate._getDate.toUTC().toISO() === '2021-11-19T07:00:00.000Z';
      expect(didNotMutate).toEqual(true);
    });

    it('should return end of month even if unit is plural. NB: not best practice, TS refuses plural', () => {
      const result = companiDate.endOf('months');

      expect(result).toEqual(expect.objectContaining({ _getDate: expect.any(luxon.DateTime) }));
      expect(result._getDate.toUTC().toISO()).toEqual('2021-11-30T22:59:59.999Z');
    });

    it('should return error if invalid unit', () => {
      try {
        companiDate.endOf('mois');
      } catch (e) {
        expect(e).toEqual(new Error('Invalid unit mois'));
      }
    });
  });

  describe('diff', () => {
    let _formatMiscToCompaniDate;
    const companiDate = CompaniDatesHelper.CompaniDate('2021-11-24T10:00:00.000Z');
    let otherDate = '2021-11-20T10:00:00.000Z';

    beforeEach(() => {
      _formatMiscToCompaniDate = sinon.spy(CompaniDatesHelper, '_formatMiscToCompaniDate');
    });

    afterEach(() => {
      _formatMiscToCompaniDate.restore();
    });

    it('should return difference in positive days', () => {
      const result = companiDate.diff(otherDate, 'days');

      expect(result).toBe(4);
      sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
    });

    it('should return diff in milliseconds, if no unit specified', () => {
      otherDate = '2021-11-24T08:29:48.000Z';
      const result = companiDate.diff(otherDate);
      const expectedDiffInMillis = 1 * 60 * 60 * 1000 + 30 * 60 * 1000 + 12 * 1000;

      expect(result).toBe(expectedDiffInMillis);
      sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
    });

    it('should return difference in days. Result should be 0 if difference is less then 24h', () => {
      otherDate = '2021-11-23T21:00:00.000Z';
      const result = companiDate.diff(otherDate, 'days');

      expect(result).toBe(0);
      sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
    });

    it('should return difference in positive floated days', () => {
      otherDate = '2021-11-22T21:00:00.000Z';
      const result = companiDate.diff(otherDate, 'days', true);

      expect(result).toBeGreaterThan(0);
      expect(result - 1.54).toBeLessThan(0.01); // 1.54 days = 1 day and 13 hours
      sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
    });

    it('should return difference in negative days', () => {
      otherDate = '2021-11-30T10:00:00.000Z';
      const result = companiDate.diff(otherDate, 'days');

      expect(result).toBe(-6);
      sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
    });

    it('should return difference in negative floated days', () => {
      otherDate = '2021-11-30T08:00:00.000Z';
      const result = companiDate.diff(otherDate, 'days', true);

      expect(result).toBeLessThan(0);
      expect(Math.abs(result) - 5.91).toBeLessThan(0.01); // 5.91 days = 5 days and 22 hours
      sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
    });

    it('should return error if invalid otherDate', () => {
      try {
        companiDate.diff(null, 'days', true);
      } catch (e) {
        expect(e).toEqual(new Error('Invalid DateTime: wrong arguments'));
      } finally {
        sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, null);
      }
    });

    it('should return error if invalid unit', () => {
      try {
        companiDate.diff(otherDate, 'jour', true);
      } catch (e) {
        expect(e).toEqual(new Error('Invalid unit jour'));
      } finally {
        sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
      }
    });
  });

  describe('add', () => {
    const companiDate = CompaniDatesHelper.CompaniDate('2021-12-01T07:00:00.000Z');

    it('should return a newly constructed companiDate, inscreased by amout', () => {
      const result = companiDate.add({ months: 1, hours: 2 });

      expect(result).toEqual(expect.objectContaining({ _getDate: expect.any(luxon.DateTime) }));
      expect(result._getDate.toUTC().toISO()).toEqual('2022-01-01T09:00:00.000Z');
    });

    it('should return error if invalid unit', () => {
      try {
        companiDate.add({ jour: 1, hours: 2 });
      } catch (e) {
        expect(e).toEqual(new Error('Invalid unit jour'));
      }
    });

    it('should return error if amount is number', () => {
      try {
        companiDate.add(11111);
      } catch (e) {
        expect(e).toEqual(new Error('Invalid argument: expected to be an object, got number'));
      }
    });
  });

  describe('set', () => {
    const companiDate = CompaniDatesHelper.CompaniDate('2021-12-20T07:00:00.000Z');

    it('should return a newly constructed companiDate, updated by input', () => {
      const result = companiDate.set({ month: 11, hour: 3, millisecond: 400 });

      expect(result).toEqual(expect.objectContaining({ _getDate: expect.any(luxon.DateTime) }));
      expect(result._getDate.toUTC().toISO()).toEqual('2021-11-20T02:00:00.400Z');
    });

    it('should return error if unit is plural', () => {
      try {
        companiDate.set({ day: 1, hours: 2 });
      } catch (e) {
        expect(e).toEqual(new Error('Invalid unit hours'));
      }
    });
  });
});

describe('_formatMiscToCompaniDate', () => {
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
    const result = CompaniDatesHelper._formatMiscToCompaniDate();

    expect(result instanceof luxon.DateTime).toBe(true);
    expect(new luxon.DateTime(result).toJSDate() - new Date()).toBeLessThan(100);
    sinon.assert.calledOnceWithExactly(now);
    sinon.assert.notCalled(fromJSDate);
    sinon.assert.notCalled(fromISO);
    sinon.assert.notCalled(fromFormat);
    sinon.assert.notCalled(invalid);
  });

  it('should return dateTime if arg is object with dateTime', () => {
    const payload = { _getDate: date };
    const result = CompaniDatesHelper._formatMiscToCompaniDate(payload);

    expect(result instanceof luxon.DateTime).toBe(true);
    expect(new luxon.DateTime(result).toUTC().toISO()).toEqual('2021-11-24T07:00:00.000Z');
    sinon.assert.notCalled(now);
    sinon.assert.notCalled(fromJSDate);
    sinon.assert.notCalled(fromISO);
    sinon.assert.notCalled(fromFormat);
    sinon.assert.notCalled(invalid);
  });

  it('should return dateTime if arg is date', () => {
    const payload = new Date('2021-11-24T07:00:00.000Z');
    const result = CompaniDatesHelper._formatMiscToCompaniDate(payload);

    expect(result instanceof luxon.DateTime).toBe(true);
    expect(new luxon.DateTime(result).toUTC().toISO()).toEqual('2021-11-24T07:00:00.000Z');
    sinon.assert.calledOnceWithExactly(fromJSDate, payload);
    sinon.assert.notCalled(now);
    sinon.assert.notCalled(fromISO);
    sinon.assert.notCalled(fromFormat);
    sinon.assert.notCalled(invalid);
  });

  it('should return dateTime if arg is string', () => {
    const payload = '2021-11-24T07:00:00.000Z';
    const result = CompaniDatesHelper._formatMiscToCompaniDate(payload);

    expect(result instanceof luxon.DateTime).toBe(true);
    expect(new luxon.DateTime(result).toUTC().toISO()).toEqual('2021-11-24T07:00:00.000Z');
    sinon.assert.calledOnceWithExactly(fromISO, payload);
    sinon.assert.notCalled(now);
    sinon.assert.notCalled(fromJSDate);
    sinon.assert.notCalled(fromFormat);
    sinon.assert.notCalled(invalid);
  });

  it('should return error if arg is empty string', () => {
    try {
      CompaniDatesHelper._formatMiscToCompaniDate('');
    } catch (e) {
      expect(e).toEqual(new Error('Invalid DateTime: wrong arguments'));
    } finally {
      sinon.assert.calledOnceWithExactly(invalid, 'wrong arguments');
      sinon.assert.notCalled(now);
      sinon.assert.notCalled(fromJSDate);
      sinon.assert.notCalled(fromISO);
      sinon.assert.notCalled(fromFormat);
    }
  });

  it('should return dateTime if 2 args, first argument doesn\'t finish with Z', () => {
    const result = CompaniDatesHelper._formatMiscToCompaniDate(
      '2021-11-24T07:00:00.000+03:00',
      'yyyy-MM-dd\'T\'hh:mm:ss.SSSZZ'
    );

    expect(result instanceof luxon.DateTime).toBe(true);
    expect(new luxon.DateTime(result).toUTC().toISO()).toEqual('2021-11-24T04:00:00.000Z');
    sinon.assert.calledOnceWithExactly(
      fromFormat,
      '2021-11-24T07:00:00.000+03:00',
      'yyyy-MM-dd\'T\'hh:mm:ss.SSSZZ',
      {}
    );
    sinon.assert.notCalled(now);
    sinon.assert.notCalled(fromJSDate);
    sinon.assert.notCalled(fromISO);
    sinon.assert.notCalled(invalid);
  });

  it('should return dateTime if 2 args, first arguments finish with Z', () => {
    const result = CompaniDatesHelper._formatMiscToCompaniDate(
      '2021-11-24T07:00:00.000Z',
      'yyyy-MM-dd\'T\'hh:mm:ss.SSS\'Z\''
    );

    expect(result instanceof luxon.DateTime).toBe(true);
    expect(new luxon.DateTime(result).toUTC().toISO()).toEqual('2021-11-24T07:00:00.000Z');
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

  it('should return error if arg is dateTime', () => {
    try {
      const payload = date;
      CompaniDatesHelper._formatMiscToCompaniDate(payload);
    } catch (e) {
      expect(e).toEqual(new Error('Invalid DateTime: wrong arguments'));
    } finally {
      sinon.assert.notCalled(now);
      sinon.assert.notCalled(fromJSDate);
      sinon.assert.notCalled(fromISO);
      sinon.assert.notCalled(fromFormat);
    }
  });

  it('should return error if too many args', () => {
    try {
      CompaniDatesHelper
        ._formatMiscToCompaniDate('2021-11-24T07:00:00.000Z', 'MMMM dd yyyy', { locale: 'fr' });
    } catch (e) {
      expect(e).toEqual(new Error('Invalid DateTime: wrong arguments'));
    } finally {
      sinon.assert.calledOnceWithExactly(invalid, 'wrong arguments');
      sinon.assert.notCalled(now);
      sinon.assert.notCalled(fromJSDate);
      sinon.assert.notCalled(fromISO);
      sinon.assert.notCalled(fromFormat);
    }
  });

  it('should return error if invalid type of argument', () => {
    try {
      CompaniDatesHelper._formatMiscToCompaniDate(null);
    } catch (e) {
      expect(e).toEqual(new Error('Invalid DateTime: wrong arguments'));
    } finally {
      sinon.assert.calledOnceWithExactly(invalid, 'wrong arguments');
      sinon.assert.notCalled(now);
      sinon.assert.notCalled(fromJSDate);
      sinon.assert.notCalled(fromISO);
      sinon.assert.notCalled(fromFormat);
    }
  });
});
