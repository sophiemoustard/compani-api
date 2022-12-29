const { expect } = require('expect');
const sinon = require('sinon');
const luxon = require('../../../../src/helpers/dates/luxon');
const CompaniDatesHelper = require('../../../../src/helpers/dates/companiDates');
const {
  WEDNESDAY,
  DD_MM_YYYY,
  HH_MM_SS,
  MONTH,
  DAY,
  HOUR,
  MINUTE,
  SECOND,
  MILLISECOND,
} = require('../../../../src/helpers/constants');
const { CompaniDuration } = require('../../../../src/helpers/dates/companiDurations');

describe('CompaniDate', () => {
  let _formatMiscToCompaniDate;

  beforeEach(() => {
    _formatMiscToCompaniDate = sinon.spy(CompaniDatesHelper, '_formatMiscToCompaniDate');
  });

  afterEach(() => {
    _formatMiscToCompaniDate.restore();
  });

  it('should not mutate _date', () => {
    const isoDate = '2021-11-24T07:12:08.000Z';
    const otherIsoDate = '2022-01-03T07:12:08.000Z';
    const companiDate = CompaniDatesHelper.CompaniDate(isoDate);
    companiDate._date = luxon.DateTime.fromISO(otherIsoDate);

    expect(companiDate._getDate.toUTC().toISO()).toEqual(isoDate);
  });

  describe('Constructor', () => {
    it('should return dateTime', () => {
      const date = '2021-11-24T07:00:00.000Z';

      const result = CompaniDatesHelper.CompaniDate(date);

      expect(result)
        .toEqual(expect.objectContaining({
          _getDate: expect.any(luxon.DateTime),
          getUnits: expect.any(Function),
          weekday: expect.any(Function),
          format: expect.any(Function),
          toDate: expect.any(Function),
          toISO: expect.any(Function),
          isBefore: expect.any(Function),
          isAfter: expect.any(Function),
          isSame: expect.any(Function),
          isSameOrBefore: expect.any(Function),
          isSameOrAfter: expect.any(Function),
          isSameOrBetween: expect.any(Function),
          isHoliday: expect.any(Function),
          isBusinessDay: expect.any(Function),
          startOf: expect.any(Function),
          endOf: expect.any(Function),
          diff: expect.any(Function),
          oldDiff: expect.any(Function),
          add: expect.any(Function),
          oldAdd: expect.any(Function),
          subtract: expect.any(Function),
          oldSubtract: expect.any(Function),
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
});

describe('GETTER', () => {
  describe('getDate', () => {
    it('should return _date', () => {
      const isoDate = '2021-11-24T07:12:08.000Z';
      const companiDate = CompaniDatesHelper.CompaniDate(isoDate);
      const result = companiDate._getDate;

      expect(result).toEqual(expect.any(luxon.DateTime));
      expect(result).toEqual(luxon.DateTime.fromISO(isoDate));
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

  describe('weekday', () => {
    it('should return week day', () => {
      const companiDate = CompaniDatesHelper.CompaniDate('2022-02-02T07:12:08.000Z'); // wednesday
      const result = companiDate.weekday();

      expect(result).toEqual(2);
      expect(result).toEqual(WEDNESDAY);
    });
  });
});

describe('DISPLAY', () => {
  describe('format', () => {
    it('should return formated date in a string', () => {
      const companiDate = CompaniDatesHelper.CompaniDate('2021-11-24T07:12:08.000Z');
      const result = companiDate.format(`'Le' ${DD_MM_YYYY} 'à' ${HH_MM_SS}`);

      expect(result).toBe('Le 24/11/2021 à 08:12:08');
    });
  });

  describe('toDate', () => {
    it('should return a JSDate equivalent to companiDate (in utc)', () => {
      const companiDate = CompaniDatesHelper.CompaniDate('2021-11-24T07:00:00.000+01:00');
      const result = companiDate.toDate();

      expect(result).toEqual(new Date('2021-11-24T06:00:00.000Z'));
    });
  });

  describe('toISO', () => {
    it('should return a string ISO 8601 equivalent to companiDate (in utc)', () => {
      const companiDate = CompaniDatesHelper.CompaniDate('2021-12-24T12:00:00.000+03:00');
      const result = companiDate.toISO();

      expect(result).toEqual('2021-12-24T09:00:00.000Z');
    });
  });

  describe('toLocalISO', () => {
    it('should return a string ISO 8601 equivalent to companiDate (in local)', () => {
      const companiDate = CompaniDatesHelper.CompaniDate('2021-12-24T12:00:00.000+03:00');
      const result = companiDate.toLocalISO();

      expect(result).toEqual('2021-12-24T10:00:00.000+01:00');
    });
  });
});

describe('QUERY', () => {
  describe('isBefore', () => {
    let _formatMiscToCompaniDate;
    const companiDate = CompaniDatesHelper.CompaniDate('2021-11-01T07:00:00.000Z');

    beforeEach(() => {
      _formatMiscToCompaniDate = sinon.spy(CompaniDatesHelper, '_formatMiscToCompaniDate');
    });

    afterEach(() => {
      _formatMiscToCompaniDate.restore();
    });

    it('should return true if date is before other date', () => {
      const otherDate = '2021-11-01T10:00:00.000Z';
      const result = companiDate.isBefore(otherDate);

      expect(result).toBe(true);
      sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
    });

    it('should return false if date is not before other date', () => {
      const otherDate = '2021-11-01T05:00:00.000Z';
      const result = companiDate.isBefore(otherDate);

      expect(result).toBe(false);
      sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
    });

    it('should return false if date is before but same as specified unit', () => {
      const otherDate = '2021-11-01T07:00:12.000Z';
      const result = companiDate.isBefore(otherDate, 'minute');

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
    const companiDate = CompaniDatesHelper.CompaniDate('2021-11-01T07:00:00.000Z');

    beforeEach(() => {
      _formatMiscToCompaniDate = sinon.spy(CompaniDatesHelper, '_formatMiscToCompaniDate');
    });

    afterEach(() => {
      _formatMiscToCompaniDate.restore();
    });

    it('should return true if date is after other date', () => {
      const otherDate = '2021-11-01T05:00:00.000Z';
      const result = companiDate.isAfter(otherDate);

      expect(result).toBe(true);
      sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
    });

    it('should return false if date is not after other date', () => {
      const otherDate = '2021-11-01T10:00:00.000Z';
      const result = companiDate.isAfter(otherDate);

      expect(result).toBe(false);
      sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
    });

    it('should return false if date is after but same as specified unit', () => {
      const otherDate = '2021-11-01T05:00:00.000Z';
      const result = companiDate.isAfter(otherDate, 'day');

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
    const companiDate = CompaniDatesHelper.CompaniDate('2021-11-24T07:04:00.000Z');

    beforeEach(() => {
      _formatMiscToCompaniDate = sinon.spy(CompaniDatesHelper, '_formatMiscToCompaniDate');
    });

    afterEach(() => {
      _formatMiscToCompaniDate.restore();
    });

    it('should return true if otherDate is happening the same day', () => {
      const otherDate = '2021-11-24T00:00:00.000Z';
      const result = companiDate.isSame(otherDate, 'day');

      expect(result).toBe(true);
      sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
    });

    it('should return true, default unit is milis and otherDate is happening during the same milis', () => {
      const otherDate = '2021-11-24T07:04:00.000Z';
      const result = companiDate.isSame(otherDate);

      expect(result).toBe(true);
      sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
    });

    it('should return false, even if otherDate has same minute value: 4, it is happening 180 minutes after', () => {
      const otherDate = '2021-11-24T10:04:00.000Z';
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
      const otherDate = '2021-11-24T10:04:00.000Z';
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

    beforeEach(() => {
      _formatMiscToCompaniDate = sinon.spy(CompaniDatesHelper, '_formatMiscToCompaniDate');
    });

    afterEach(() => {
      _formatMiscToCompaniDate.restore();
    });

    it('should return true if same', () => {
      const otherDate = '2021-11-24T07:00:00.000Z';

      const result = companiDate.isSameOrBefore(otherDate);

      expect(result).toBe(true);
      sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
    });

    it('should return true if before', () => {
      const otherDate = '2021-11-25T10:00:00.000Z';
      const result = companiDate.isSameOrBefore(otherDate);

      expect(result).toBe(true);
      sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
    });

    it('should return true if after but same as specified unit', () => {
      const otherDate = '2021-11-24T06:00:00.000Z';

      const result = companiDate.isSameOrBefore(otherDate, 'day');

      expect(result).toBe(true);
      sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
    });

    it('should return false if after', () => {
      const otherDate = '2021-11-23T10:00:00.000Z';

      const result = companiDate.isSameOrBefore(otherDate);

      expect(result).toBe(false);
      sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
    });

    it('should return false if after specified unit', () => {
      const otherDate = '2021-11-24T06:00:00.000Z';

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
      const otherDate = '2021-11-24T06:00:00.000Z';
      try {
        companiDate.isSameOrBefore(otherDate, 'minutes');
      } catch (e) {
        expect(e).toEqual(new Error('Invalid unit minutes'));
      } finally {
        sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
      }
    });
  });

  describe('isSameOrAfter', () => {
    let _formatMiscToCompaniDate;
    const companiDate = CompaniDatesHelper.CompaniDate('2021-11-24T07:00:00.000Z');

    beforeEach(() => {
      _formatMiscToCompaniDate = sinon.spy(CompaniDatesHelper, '_formatMiscToCompaniDate');
    });

    afterEach(() => {
      _formatMiscToCompaniDate.restore();
    });

    it('should return true if same', () => {
      const otherDate = '2021-11-24T07:00:00.000Z';

      const result = companiDate.isSameOrAfter(otherDate);

      expect(result).toBe(true);
      sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
    });

    it('should return false if before', () => {
      const otherDate = '2021-11-25T10:00:00.000Z';
      const result = companiDate.isSameOrAfter(otherDate);

      expect(result).toBe(false);
      sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
    });

    it('should return true if before but same as specified unit', () => {
      const otherDate = '2021-11-24T08:00:00.000Z';

      const result = companiDate.isSameOrAfter(otherDate, 'day');

      expect(result).toBe(true);
      sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
    });

    it('should return true if after', () => {
      const otherDate = '2021-11-23T10:00:00.000Z';

      const result = companiDate.isSameOrAfter(otherDate);

      expect(result).toBe(true);
      sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
    });

    it('should return false if before specified unit', () => {
      const otherDate = '2021-11-24T08:00:00.000Z';

      const result = companiDate.isSameOrAfter(otherDate, 'minute');

      expect(result).toBe(false);
      sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
    });

    it('should return error if invalid otherDate', () => {
      try {
        companiDate.isSameOrAfter(null);
      } catch (e) {
        expect(e).toEqual(new Error('Invalid DateTime: wrong arguments'));
      } finally {
        sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, null);
      }
    });

    it('should return error if unit is plural', () => {
      const otherDate = '2021-11-24T06:00:00.000Z';
      try {
        companiDate.isSameOrAfter(otherDate, 'minutes');
      } catch (e) {
        expect(e).toEqual(new Error('Invalid unit minutes'));
      } finally {
        sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
      }
    });
  });

  describe('isSameOrBetween', () => {
    let _formatMiscToCompaniDate;
    const companiDate = CompaniDatesHelper.CompaniDate('2021-11-24T07:00:00.000Z');

    beforeEach(() => {
      _formatMiscToCompaniDate = sinon.spy(CompaniDatesHelper, '_formatMiscToCompaniDate');
    });

    afterEach(() => {
      _formatMiscToCompaniDate.restore();
    });

    it('should return true if same as first date', () => {
      const firstDate = '2021-11-24T07:00:00.000Z';
      const secondDate = '2021-11-27T07:00:00.000Z';

      const result = companiDate.isSameOrBetween(firstDate, secondDate);

      expect(result).toBe(true);
      sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(0), firstDate);
      sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(1), secondDate);
    });

    it('should return true if same as second date', () => {
      const firstDate = '2021-11-21T07:00:00.000Z';
      const secondDate = '2021-11-24T07:00:00.000Z';

      const result = companiDate.isSameOrBetween(firstDate, secondDate);

      expect(result).toBe(true);
      sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(0), firstDate);
      sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(1), secondDate);
    });

    it('should return true if before first date but same as specified unit', () => {
      const firstDate = '2021-11-24T08:00:00.000Z';
      const secondDate = '2021-11-27T08:00:00.000Z';

      const result = companiDate.isSameOrBetween(firstDate, secondDate, 'day');

      expect(result).toBe(true);
      sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(0), firstDate);
      sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(1), secondDate);
    });

    it('should return true if after second date but same as specified unit', () => {
      const firstDate = '2021-11-21T08:00:00.000Z';
      const secondDate = '2021-11-24T06:00:00.000Z';

      const result = companiDate.isSameOrBetween(firstDate, secondDate, 'day');

      expect(result).toBe(true);
      sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(0), firstDate);
      sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(1), secondDate);
    });

    it('should return true if between both dates', () => {
      const firstDate = '2021-11-21T08:00:00.000Z';
      const secondDate = '2021-11-25T08:00:00.000Z';

      const result = companiDate.isSameOrBetween(firstDate, secondDate);

      expect(result).toBe(true);
      sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(0), firstDate);
      sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(1), secondDate);
    });

    it('should return false if before first date', () => {
      const firstDate = '2021-11-25T10:00:00.000Z';
      const secondDate = '2021-11-27T10:00:00.000Z';
      const result = companiDate.isSameOrBetween(firstDate, secondDate);

      expect(result).toBe(false);
      sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(0), firstDate);
      sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(1), secondDate);
    });

    it('should return false if before specified unit (first date)', () => {
      const firstDate = '2021-11-24T08:00:00.000Z';
      const secondDate = '2021-11-27T08:00:00.000Z';

      const result = companiDate.isSameOrBetween(firstDate, secondDate, 'minute');

      expect(result).toBe(false);
      sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(0), firstDate);
      sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(1), secondDate);
    });

    it('should return false if after second date', () => {
      const firstDate = '2021-11-21T10:00:00.000Z';
      const secondDate = '2021-11-23T10:00:00.000Z';
      const result = companiDate.isSameOrBetween(firstDate, secondDate);

      expect(result).toBe(false);
      sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(0), firstDate);
      sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(1), secondDate);
    });

    it('should return false if after specified unit (second date)', () => {
      const firstDate = '2021-11-21T08:00:00.000Z';
      const secondDate = '2021-11-24T06:00:00.000Z';

      const result = companiDate.isSameOrBetween(firstDate, secondDate, 'minute');

      expect(result).toBe(false);
      sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(0), firstDate);
      sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(1), secondDate);
    });

    it('should return error if invalid otherDate', () => {
      const firstDate = '2021-11-24T08:00:00.000Z';
      try {
        companiDate.isSameOrBetween(firstDate, null);
      } catch (e) {
        expect(e).toEqual(new Error('Invalid DateTime: wrong arguments'));
      } finally {
        sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(0), firstDate);
        sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(1), null);
      }
    });

    it('should return error if unit is plural', () => {
      const firstDate = '2021-11-24T06:00:00.000Z';
      const secondDate = '2021-11-27T06:00:00.000Z';
      try {
        companiDate.isSameOrBetween(firstDate, secondDate, 'minutes');
      } catch (e) {
        expect(e).toEqual(new Error('Invalid unit minutes'));
      } finally {
        sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(0), firstDate);
        sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(1), secondDate);
      }
    });
  });

  describe('hasSameUnits', () => {
    let _formatMiscToCompaniDate;
    const companiDate = CompaniDatesHelper.CompaniDate('2022-11-22T10:00:00.000Z');
    const otherDate = '2021-11-27T10:00:00.000Z';

    beforeEach(() => {
      _formatMiscToCompaniDate = sinon.spy(CompaniDatesHelper, '_formatMiscToCompaniDate');
    });

    afterEach(() => {
      _formatMiscToCompaniDate.restore();
    });

    it('should return true if all units have same values', () => {
      const result = companiDate.hasSameUnits(otherDate, [MONTH, HOUR, MINUTE, SECOND, MILLISECOND]);

      expect(result).toBe(true);
      sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(0), otherDate);
    });

    it('should return false if not all units have same values', () => {
      const result = companiDate.hasSameUnits(otherDate, [MONTH, DAY, HOUR, MINUTE, SECOND, MILLISECOND]);

      expect(result).toBe(false);
      sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(0), otherDate);
    });
  });

  describe('isHoliday', () => {
    it('should return true, Christmas is a holiday', () => {
      const christmas = CompaniDatesHelper.CompaniDate('2000-12-25T07:00:00.000Z');
      const result = christmas.isHoliday();

      expect(result).toEqual(true);
    });

    it('should return true, Labor day is a holiday', () => {
      const laborDay = CompaniDatesHelper.CompaniDate('2010-05-01T07:00:00.000Z');
      const result = laborDay.isHoliday();

      expect(result).toEqual(true);
    });

    it('should return false, Mother\'s day isn\'t a holiday', () => {
      const mothersDay = CompaniDatesHelper.CompaniDate('2025-05-25T07:00:00.000Z'); // 'sunday before 06.01'
      const result = mothersDay.isHoliday();

      expect(result).toEqual(false);
    });

    it('should return false, Pentecost isn\'t a holiday', () => {
      const pentecost = CompaniDatesHelper.CompaniDate('2022-06-05T07:00:00.000Z'); // 'easter 49'
      const result = pentecost.isHoliday();

      expect(result).toEqual(false);
    });

    it('should return false, monday after Pentecost isn\'t a holiday', () => {
      const mondayAfterPentecost = CompaniDatesHelper.CompaniDate('2022-06-06T07:00:00.000Z'); // 'easter 50'
      const result = mondayAfterPentecost.isHoliday();

      expect(result).toEqual(false);
    });
  });

  describe('isBusinessDay', () => {
    it('should return true if random business day', () => {
      const day = CompaniDatesHelper.CompaniDate('2022-02-02T07:00:00.000Z'); // random wednesday
      const result = day.isBusinessDay();

      expect(result).toEqual(true);
    });

    it('should return false if holiday during the week', () => {
      const day = CompaniDatesHelper.CompaniDate('2022-07-14T07:00:00.000Z'); // national day on thursday
      const result = day.isBusinessDay();

      expect(result).toEqual(false);
    });

    it('should return false if week-end random day', () => {
      const day = CompaniDatesHelper.CompaniDate('2022-01-30T07:00:00.000Z'); // random sunday
      const result = day.isBusinessDay();

      expect(result).toEqual(false);
    });

    it('should return false if holiday during the week-end', () => {
      const day = CompaniDatesHelper.CompaniDate('2022-01-01T07:00:00.000Z'); // new year on saturday
      const result = day.isBusinessDay();

      expect(result).toEqual(false);
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

  describe('diff', () => {
    let _formatMiscToCompaniDate;
    const companiDate = CompaniDatesHelper.CompaniDate('2021-10-18T10:00:00.000Z');

    beforeEach(() => {
      _formatMiscToCompaniDate = sinon.spy(CompaniDatesHelper, '_formatMiscToCompaniDate');
    });

    afterEach(() => {
      _formatMiscToCompaniDate.restore();
    });

    describe('Difference in int', () => {
      it('should return difference in int years', () => {
        const otherDate = '2019-10-18T10:00:00.000Z';
        const result = companiDate.diff(otherDate, 'years');

        expect(result).toStrictEqual('P2Y');
        sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
      });

      it('should return difference in int month', () => {
        const otherDate = '2021-08-18T10:00:00.000Z';
        const result = companiDate.diff(otherDate, 'months');

        expect(result).toStrictEqual('P2M');
        sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
      });

      it('should return difference in int weeks', () => {
        const otherDate = '2021-08-09T10:00:00.000Z';
        const result = companiDate.diff(otherDate, 'weeks');

        expect(result).toStrictEqual('P10W');
        sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
      });

      it('should return difference in int days', () => {
        const otherDate = '2021-10-14T10:00:00.000Z';
        const result = companiDate.diff(otherDate, 'days');

        expect(result).toStrictEqual('P4D');
        sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
      });

      it('should return difference in int minutes', () => {
        const otherDate = '2021-10-14T10:00:00.000Z';
        const result = companiDate.diff(otherDate, 'minutes');

        expect(result).toStrictEqual('PT5760M');
        sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
      });

      it('should return difference in int seconds', () => {
        const otherDate = '2021-10-18T09:45:55.000Z';
        const result = companiDate.diff(otherDate, 'seconds');

        expect(result).toStrictEqual(`PT${14 * 60 + 5}S`);
        sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
      });

      it('should return difference in int negative days', () => {
        const otherDate = '2021-10-24T10:00:00.000Z';
        const result = companiDate.diff(otherDate, 'days');

        expect(result).toStrictEqual('P-6D');
        sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
      });
    });

    describe('Difference in float', () => {
      it('should return difference in float years', () => {
        const otherDate = '2019-09-12T03:31:09.120Z';
        const result = companiDate.diff(otherDate, 'years');

        expect(result).toStrictEqual(`P2YT${36 * 24 * 60 * 60 + 6 * 60 * 60 + 28 * 60 + 50.880}S`);
        sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
      });

      it('should return difference in float month', () => {
        const otherDate = '2021-07-28T17:03:38.108Z';
        const result = companiDate.diff(otherDate, 'months');

        expect(result).toStrictEqual(`P2MT${19 * 24 * 60 * 60 + 16 * 60 * 60 + 56 * 60 + 21.892}S`);
        sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
      });

      it('should return difference in float weeks', () => {
        const otherDate = '2021-07-16T01:54:23.811Z';
        const result = companiDate.diff(otherDate, 'weeks');

        expect(result).toStrictEqual(`P13WT${3 * 24 * 60 * 60 + 8 * 60 * 60 + 5 * 60 + 36.189}S`);
        sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
      });

      it('should return difference in float days', () => {
        const otherDate = '2021-09-01T23:28:11.020Z';
        const result = companiDate.diff(otherDate, 'days');

        expect(result).toStrictEqual(`P46DT${10 * 60 * 60 + 31 * 60 + 48.980}S`);
        sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
      });

      it('should return difference in float minutes', () => {
        const otherDate = '2021-10-17T14:40:33.179Z';
        const result = companiDate.diff(otherDate, 'minutes');

        expect(result).toStrictEqual(`PT${19 * 60 + 19}M26.821S`);
        sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
      });

      it('should return difference in float seconds', () => {
        const otherDate = '2021-10-18T09:30:39.019Z';
        const result = companiDate.diff(otherDate, 'seconds');

        expect(result).toStrictEqual(`PT${29 * 60 + 20}.981S`);
        sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
      });
    });

    describe('Specific calendar differences in month', () => {
      it('should return difference of 1 month or 30 days, in may, compute between same day of month', () => {
        const date = '2021-05-03T00:00:00.000Z';
        const otherDate = '2021-04-03T00:00:00.000Z';
        const diffInMonths = CompaniDatesHelper.CompaniDate(date).diff(otherDate, 'months');
        const diffInDays = CompaniDatesHelper.CompaniDate(date).diff(otherDate, 'days');

        expect(diffInMonths).toStrictEqual('P1M');
        expect(diffInDays).toStrictEqual('P30D');
        sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(0), date);
        sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(1), otherDate);
      });

      it('should return difference of 1 month or 31 days, in jun, compute between same day of month', () => {
        const date = '2021-06-03T00:00:00.000Z';
        const otherDate = '2021-05-03T00:00:00.000Z';
        const diffInMonths = CompaniDatesHelper.CompaniDate(date).diff(otherDate, 'months');
        const diffInDays = CompaniDatesHelper.CompaniDate(date).diff(otherDate, 'days');

        expect(diffInMonths).toStrictEqual('P1M');
        expect(diffInDays).toStrictEqual('P31D');
        sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(0), date);
        sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(1), otherDate);
      });

      it('should return difference of 1 month or 30 days, in may, compute between ends of month', () => {
        const date = '2021-04-30T00:00:00.000Z';
        const otherDate = '2021-03-31T00:00:00.000Z';
        const diffInMonths = CompaniDatesHelper.CompaniDate(date).diff(otherDate, 'months');
        const diffInDays = CompaniDatesHelper.CompaniDate(date).diff(otherDate, 'days');

        expect(diffInMonths).toStrictEqual('P1M');
        expect(diffInDays).toStrictEqual('P30D');
        sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(0), date);
        sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(1), otherDate);
      });

      it('should return difference of (1 month + 1 day) or 31 days, in jun, compute between endOf of months', () => {
        const date = '2021-05-31T00:00:00.000Z';
        const otherDate = '2021-04-30T00:00:00.000Z';
        const diffInMonths = CompaniDatesHelper.CompaniDate(date).diff(otherDate, 'months');
        const diffInDays = CompaniDatesHelper.CompaniDate(date).diff(otherDate, 'days');

        expect(diffInMonths).toStrictEqual(`P1MT${24 * 60 * 60}S`);
        expect(diffInDays).toStrictEqual('P31D');
        sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(0), date);
        sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(1), otherDate);
      });
    });

    describe('Differences on leap year', () => {
      it('should return difference of 1 year or 366 days, if leap year', () => {
        const date = '2021-01-01T10:00:00.000Z';
        const otherDate = '2020-01-01T10:00:00.000Z';
        const diffInYears = CompaniDatesHelper.CompaniDate(date).diff(otherDate, 'years');
        const diffInDays = CompaniDatesHelper.CompaniDate(date).diff(otherDate, 'days');

        expect(diffInYears).toStrictEqual('P1Y');
        expect(diffInDays).toStrictEqual('P366D');
        sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(0), date);
        sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(1), otherDate);
      });

      it('should return difference of 1 year or 365 days, if NOT a leap year', () => {
        const date = '2022-01-01T10:00:00.000Z';
        const otherDate = '2021-01-01T10:00:00.000Z';
        const diffInYears = CompaniDatesHelper.CompaniDate(date).diff(otherDate, 'years');
        const diffInDays = CompaniDatesHelper.CompaniDate(date).diff(otherDate, 'days');

        expect(diffInYears).toStrictEqual('P1Y');
        expect(diffInDays).toStrictEqual('P365D');
        sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(0), date);
        sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(1), otherDate);
      });

      it('should return difference of 1 month or 29 days, if leap year', () => {
        const date = '2020-03-01T10:00:00.000Z';
        const otherDate = '2020-02-01T10:00:00.000Z';
        const diffInYears = CompaniDatesHelper.CompaniDate(date).diff(otherDate, 'months');
        const diffInDays = CompaniDatesHelper.CompaniDate(date).diff(otherDate, 'days');

        expect(diffInYears).toStrictEqual('P1M');
        expect(diffInDays).toStrictEqual('P29D');
        sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(0), date);
        sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(1), otherDate);
      });

      it('should return difference of 1 month or 28 days, if NOT a leap year', () => {
        const date = '2021-03-01T10:00:00.000Z';
        const otherDate = '2021-02-01T10:00:00.000Z';
        const diffInYears = CompaniDatesHelper.CompaniDate(date).diff(otherDate, 'months');
        const diffInDays = CompaniDatesHelper.CompaniDate(date).diff(otherDate, 'days');

        expect(diffInYears).toStrictEqual('P1M');
        expect(diffInDays).toStrictEqual('P28D');
        sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(0), date);
        sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(1), otherDate);
      });
    });

    describe('Differences on time shift', () => {
      // please note that dates are expressed in local here (and not in UTC) in order to spotlight time shift

      it('should return difference of 1 day or 23 hours, if time shifts from winter to summer', () => {
        const date = '2021-03-28T10:00:00.000+02:00';
        const otherDate = '2021-03-27T10:00:00.000+01:00';
        const diffInDays = CompaniDatesHelper.CompaniDate(date).diff(otherDate, 'days');
        const diffInHours = CompaniDatesHelper.CompaniDate(date).diff(otherDate, 'hours');

        expect(diffInDays).toStrictEqual('P1D');
        expect(diffInHours).toStrictEqual('PT23H');
        sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(0), date);
        sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(1), otherDate);
      });

      it('should return difference of 1 month or (31 * 24 - 1) hours, if time shifts from winter to summer', () => {
        const date = '2021-04-01T10:00:00.000+02:00';
        const otherDate = '2021-03-01T10:00:00.000+01:00';
        const diffInMonth = CompaniDatesHelper.CompaniDate(date).diff(otherDate, 'months');
        const diffInDays = CompaniDatesHelper.CompaniDate(date).diff(otherDate, 'days');
        const diffInHours = CompaniDatesHelper.CompaniDate(date).diff(otherDate, 'hours');

        expect(diffInMonth).toStrictEqual('P1M');
        expect(diffInDays).toStrictEqual('P31D');
        expect(diffInHours).toStrictEqual(`PT${31 * 24 - 1}H`);
        sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(0), date);
        sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(1), otherDate);
      });

      it('should return difference in float months or in hours, if time shifts from winter to summer', () => {
        const date = '2021-04-23T10:00:00.000+02:00';
        const otherDate = '2021-03-21T20:39:47.123+01:00';
        const diffInMonth = CompaniDatesHelper.CompaniDate(date).diff(otherDate, 'months');
        const diffInHours = CompaniDatesHelper.CompaniDate(date).diff(otherDate, 'hours');

        expect(diffInMonth).toStrictEqual(`P1MT${(1 * 24 * 60 * 60) + (13 * 60 * 60) + 20 * 60 + 12.877}S`);
        // there is an hour less, if computation is made in hours
        expect(diffInHours).toStrictEqual(`PT${(31 + 1) * 24 + (13 - 1)}H${20 * 60 + 12.877}S`);
        sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(0), date);
        sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(1), otherDate);
      });

      it('should return difference in float months, time shift is absorbed in the complete month', () => {
        const date = '2021-04-03T10:00:00.000+02:00';
        const otherDate = '2021-03-01T10:00:00.000+01:00';
        const diffInMonth = CompaniDatesHelper.CompaniDate(date).diff(otherDate, 'months');

        expect(diffInMonth).toStrictEqual(`P1MT${2 * 24 * 60 * 60}S`);
        sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(0), date);
        sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(1), otherDate);
      });

      it('should return difference in float months, time shift is present in the left over', () => {
        const date = '2021-03-30T10:00:00.000+02:00';
        const otherDate = '2021-02-25T10:00:00.000+01:00';
        const diffInMonth = CompaniDatesHelper.CompaniDate(date).diff(otherDate, 'months');

        // there is an hour less, if shift happen during the left over (as left over computation is done in seconds)
        expect(diffInMonth).toStrictEqual(`P1MT${(5 * 24 * 60 * 60) - (1 * 60 * 60)}S`);
        sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(0), date);
        sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(1), otherDate);
      });

      it('should return difference of 1 day or 25 hours, if time shifts from summer to winter', () => {
        const date = '2021-10-31T10:00:00.000+01:00';
        const otherDate = '2021-10-30T10:00:00.000+02:00';
        const diffInDays = CompaniDatesHelper.CompaniDate(date).diff(otherDate, 'days');
        const diffInHours = CompaniDatesHelper.CompaniDate(date).diff(otherDate, 'hours');

        expect(diffInDays).toStrictEqual('P1D');
        expect(diffInHours).toStrictEqual('PT25H');
        sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(0), date);
        sinon.assert.calledWithExactly(_formatMiscToCompaniDate.getCall(1), otherDate);
      });
    });

    it('should return difference 0 expressed in second (despite that diff was made in days)', () => {
      const result = companiDate.diff(companiDate, 'days');

      expect(result).toStrictEqual('PT0S');
      sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, companiDate);
    });

    it('should return difference in positive day (singular) /!\\ bad practice to use singular', () => {
      const otherDate = '2021-10-14T10:00:00.000Z';
      const result = companiDate.diff(otherDate, 'day');

      expect(result).toStrictEqual('P4D');
      sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
    });

    it('should return error if invalid otherDate', () => {
      try {
        companiDate.diff(null, 'days');

        expect(true).toBe(false);
      } catch (e) {
        expect(e).toEqual(new Error('Invalid DateTime: wrong arguments'));
      } finally {
        sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, null);
      }
    });

    it('should return error if many units', () => {
      const otherDate = '2021-11-30T08:00:00.000Z';
      try {
        companiDate.diff(otherDate, ['days', 'minutes']);

        expect(true).toBe(false);
      } catch (e) {
        expect(e).toEqual(new Error('Invalid argument: expected unit to be a string'));
      }
    });

    it('should return error if invalid unit', () => {
      const otherDate = '2021-11-30T08:00:00.000Z';
      try {
        companiDate.diff(otherDate, 'jour');

        expect(true).toBe(false);
      } catch (e) {
        expect(e).toEqual(new Error('Invalid unit jour'));
      } finally {
        sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
      }
    });

    it('should return error if missing unit', () => {
      const otherDate = '2021-11-30T08:00:00.000Z';
      try {
        companiDate.diff(otherDate);

        expect(true).toBe(false);
      } catch (e) {
        expect(e).toEqual(new Error('Invalid argument: expected unit to be a string'));
      }
    });
  });

  describe('add', () => {
    it('should add iso amount to date', () => {
      const result = CompaniDatesHelper.CompaniDate('2022-01-01T00:00:00.000Z').add('P1DT2H32M2.5S');

      expect(result.toISO()).toBe('2022-01-02T02:32:02.500Z');
    });

    it('should return error if invalid iso duration', () => {
      try {
        CompaniDatesHelper.CompaniDate('2022-01-01T00:00:00.000Z').add('P1D2H32M2.5S');

        expect(true).toBe(false);
      } catch (e) {
        expect(e).toEqual(
          new Error('Invalid Duration: unparsable: the input "P1D2H32M2.5S" can\'t be parsed as ISO 8601')
        );
      }
    });

    it('should return error if instance of CompaniDuration', () => {
      try {
        CompaniDatesHelper.CompaniDate('2022-01-01T00:00:00.000Z').add(CompaniDuration('PT1M'));

        expect(true).toBe(false);
      } catch (e) {
        expect(e).toEqual(
          new Error('Invalid Duration: unparsable: the input "[object Object]" can\'t be parsed as ISO 8601')
        );
      }
    });

    it('should return error if object', () => {
      try {
        CompaniDatesHelper.CompaniDate('2022-01-01T00:00:00.000Z').add({ minute: 1 });

        expect(true).toBe(false);
      } catch (e) {
        expect(e).toEqual(
          new Error('Invalid Duration: unparsable: the input "[object Object]" can\'t be parsed as ISO 8601')
        );
      }
    });

    it('should return error if number', () => {
      try {
        CompaniDatesHelper.CompaniDate('2022-01-01T00:00:00.000Z').add(12);

        expect(true).toBe(false);
      } catch (e) {
        expect(e).toEqual(
          new Error('Invalid Duration: unparsable: the input "12" can\'t be parsed as ISO 8601')
        );
      }
    });
  });

  describe('subtract', () => {
    it('should subtract iso amount to date', () => {
      const result = CompaniDatesHelper.CompaniDate('2022-01-01T00:00:00.000Z').subtract('P1Y2M3DT1H15M33S');

      expect(result.toISO()).toBe('2020-10-28T22:44:27.000Z');
    });

    it('should return error if invalid iso duration', () => {
      try {
        CompaniDatesHelper.CompaniDate('2022-01-01T00:00:00.000Z').subtract('P1M3Y');

        expect(true).toBe(false);
      } catch (e) {
        expect(e).toEqual(
          new Error('Invalid Duration: unparsable: the input "P1M3Y" can\'t be parsed as ISO 8601')
        );
      }
    });

    it('should return error if instance of CompaniDuration', () => {
      try {
        CompaniDatesHelper.CompaniDate('2022-01-01T00:00:00.000Z').subtract(CompaniDuration('PT1M'));

        expect(true).toBe(false);
      } catch (e) {
        expect(e).toEqual(
          new Error('Invalid Duration: unparsable: the input "[object Object]" can\'t be parsed as ISO 8601')
        );
      }
    });

    it('should return error if object', () => {
      try {
        CompaniDatesHelper.CompaniDate('2022-01-01T00:00:00.000Z').subtract({ minute: 1 });

        expect(true).toBe(false);
      } catch (e) {
        expect(e).toEqual(
          new Error('Invalid Duration: unparsable: the input "[object Object]" can\'t be parsed as ISO 8601')
        );
      }
    });

    it('should return error if number', () => {
      try {
        CompaniDatesHelper.CompaniDate('2022-01-01T00:00:00.000Z').subtract(12);

        expect(true).toBe(false);
      } catch (e) {
        expect(e).toEqual(
          new Error('Invalid Duration: unparsable: the input "12" can\'t be parsed as ISO 8601')
        );
      }
    });
  });
});

describe('Old functions to be deleted', () => {
  describe('oldDiff', () => {
    let _formatMiscToCompaniDate;
    const companiDate = CompaniDatesHelper.CompaniDate('2021-11-24T10:00:00.000Z');

    beforeEach(() => {
      _formatMiscToCompaniDate = sinon.spy(CompaniDatesHelper, '_formatMiscToCompaniDate');
    });

    afterEach(() => {
      _formatMiscToCompaniDate.restore();
    });

    it('should return difference in positive days', () => {
      const otherDate = '2021-11-20T10:00:00.000Z';
      const result = companiDate.oldDiff(otherDate, 'days');

      expect(result).toStrictEqual({ days: 4 });
      sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
    });

    it('should return difference in days. Result should be 0 if difference is less then 24h', () => {
      const otherDate = '2021-11-23T21:00:00.000Z';
      const result = companiDate.oldDiff(otherDate, 'days');

      expect(result).toStrictEqual({ days: 0 });
      sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
    });

    it('should return difference in positive days', () => {
      const otherDate = '2021-11-22T21:00:00.000Z';
      const result = companiDate.oldDiff(otherDate, 'days');

      expect(result).toStrictEqual({ days: 1 });
      sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
    });

    it('should return difference in negative days', () => {
      const otherDate = '2021-11-30T10:00:00.000Z';
      const result = companiDate.oldDiff(otherDate, 'days');

      expect(result).toStrictEqual({ days: -6 });
      sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
    });

    it('should return difference in float if typeFloat param', () => {
      const otherDate = '2021-11-20T22:00:00.000Z';
      const result = companiDate.oldDiff(otherDate, 'days', true);

      expect(result).toStrictEqual({ days: 3.5 });
      sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
    });

    it('should return error if invalid otherDate', () => {
      try {
        companiDate.oldDiff(null, 'days');
      } catch (e) {
        expect(e).toEqual(new Error('Invalid DateTime: wrong arguments'));
      } finally {
        sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, null);
      }
    });

    it('should return error if invalid unit', () => {
      const otherDate = '2021-11-30T08:00:00.000Z';
      try {
        companiDate.oldDiff(otherDate, 'jour');
      } catch (e) {
        expect(e).toEqual(new Error('Invalid unit jour'));
      } finally {
        sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
      }
    });

    it('should return error if missing unit', () => {
      const otherDate = '2021-11-30T08:00:00.000Z';
      try {
        companiDate.oldDiff(otherDate);
      } catch (e) {
        expect(e).toEqual(new Error('Invalid unit undefined'));
      } finally {
        sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDate, otherDate);
      }
    });
  });

  describe('oldAdd', () => {
    const companiDate = CompaniDatesHelper.CompaniDate('2021-12-01T07:00:00.000Z');

    it('should return a newly constructed companiDate, increased by amount', () => {
      const result = companiDate.oldAdd({ months: 1, hours: 2 });

      expect(result).toEqual(expect.objectContaining({ _getDate: expect.any(luxon.DateTime) }));
      expect(result._getDate.toUTC().toISO()).toEqual('2022-01-01T09:00:00.000Z');
    });

    it('should return error if invalid unit', () => {
      try {
        companiDate.oldAdd({ jour: 1, hours: 2 });
      } catch (e) {
        expect(e).toEqual(new Error('Invalid unit jour'));
      }
    });

    it('should return error if amount is number', () => {
      try {
        companiDate.oldAdd(11111);
      } catch (e) {
        expect(e).toEqual(new Error('Invalid argument: expected to be an object, got number'));
      }
    });
  });

  describe('oldSubtract', () => {
    const companiDate = CompaniDatesHelper.CompaniDate('2021-12-01T07:00:00.000Z');

    it('should return a newly constructed companiDate, decreased by amount', () => {
      const result = companiDate.oldSubtract({ months: 1, hours: 2 });

      expect(result).toEqual(expect.objectContaining({ _getDate: expect.any(luxon.DateTime) }));
      expect(result._getDate.toUTC().toISO()).toEqual('2021-11-01T05:00:00.000Z');
    });

    it('should return error if invalid unit', () => {
      try {
        companiDate.oldSubtract({ jour: 1, hours: 2 });
      } catch (e) {
        expect(e).toEqual(new Error('Invalid unit jour'));
      }
    });

    it('should return error if amount is number', () => {
      try {
        companiDate.oldSubtract(11111);
      } catch (e) {
        expect(e).toEqual(new Error('Invalid argument: expected to be an object, got number'));
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
