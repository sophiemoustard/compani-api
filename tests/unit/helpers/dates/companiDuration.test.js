const expect = require('expect');
const sinon = require('sinon');
const { HhMM, HhMMmin } = require('../../../../src/helpers/constants');
const luxon = require('../../../../src/helpers/dates/luxon');
const CompaniDurationsHelper = require('../../../../src/helpers/dates/companiDurations');

describe('CompaniDuration', () => {
  let _formatMiscToCompaniDuration;

  beforeEach(() => {
    _formatMiscToCompaniDuration = sinon.spy(CompaniDurationsHelper, '_formatMiscToCompaniDuration');
  });

  afterEach(() => {
    _formatMiscToCompaniDuration.restore();
  });

  it('should not mutate _duration', () => {
    const durationObject = { days: 2 };
    const otherDurationObject = { hours: 10 };
    const companiDuration = CompaniDurationsHelper.CompaniDuration(durationObject);
    companiDuration._duration = luxon.Duration.fromObject(otherDurationObject);

    expect(companiDuration._getDuration.toObject()).toEqual(durationObject);
  });

  describe('Constructor', () => {
    it('should return duration', () => {
      const duration = { days: 13, hours: 19, minutes: 12 };

      const result = CompaniDurationsHelper.CompaniDuration(duration);

      expect(result)
        .toEqual(expect.objectContaining({
          _getDuration: expect.any(luxon.Duration),
          format: expect.any(Function),
          asHours: expect.any(Function),
          toObject: expect.any(Function),
          toISO: expect.any(Function),
          add: expect.any(Function),
        }));
      sinon.assert.calledWithExactly(_formatMiscToCompaniDuration.getCall(0), duration);
    });

    it('should return error if invalid argument', () => {
      try {
        CompaniDurationsHelper.CompaniDuration(null);
      } catch (e) {
        expect(e).toEqual(new Error('Invalid Duration: wrong arguments'));
      } finally {
        sinon.assert.calledOnceWithExactly(_formatMiscToCompaniDuration, null);
      }
    });
  });
});

describe('GETTER', () => {
  describe('getDuration', () => {
    it('should return _duration', () => {
      const durationObject = { hours: 3, minutes: 22, seconds: 57 };
      const companiDuration = CompaniDurationsHelper.CompaniDuration(durationObject);
      const result = companiDuration._getDuration;

      expect(result).toEqual(expect.any(luxon.Duration));
      expect(result).toEqual(luxon.Duration.fromObject(durationObject));
    });
  });
});

describe('DISPLAY', () => {
  describe('format', () => {
    describe('HhMM', () => {
      it('should return formatted duration with minutes', () => {
        const companiDuration = CompaniDurationsHelper.CompaniDuration('PT5H16M');
        const result = companiDuration.format(HhMM);

        expect(result).toBe('5h16');
      });

      it('should return formatted duration with minutes, leading zero on minutes', () => {
        const companiDuration = CompaniDurationsHelper.CompaniDuration('PT5H3M');
        const result = companiDuration.format(HhMM);

        expect(result).toBe('5h03');
      });

      it('should return formatted duration without minutes', () => {
        const companiDuration = CompaniDurationsHelper.CompaniDuration('PT13H');
        const result = companiDuration.format(HhMM);

        expect(result).toBe('13h');
      });

      it('should return formatted duration without hours', () => {
        const companiDuration = CompaniDurationsHelper.CompaniDuration('PT34M');
        const result = companiDuration.format(HhMM);

        expect(result).toBe('0h34');
      });

      it('should return formatted duration without hours, leading zero on minutes', () => {
        const companiDuration = CompaniDurationsHelper.CompaniDuration('PT8M');
        const result = companiDuration.format(HhMM);

        expect(result).toBe('0h08');
      });

      it('should return formatted duration, value is 0', () => {
        const companiDuration = CompaniDurationsHelper.CompaniDuration('PT0S');
        const result = companiDuration.format(HhMM);

        expect(result).toBe('0h');
      });

      it('should return formatted duration, days are converted to hours', () => {
        const companiDuration = CompaniDurationsHelper.CompaniDuration('P2DT1H');
        const result = companiDuration.format(HhMM);

        expect(result).toBe('49h');
      });

      it('should return formatted duration, month are converted to hours', () => {
        const companiDuration = CompaniDurationsHelper.CompaniDuration('P1M');
        const result = companiDuration.format(HhMM);

        expect(result).toBe('720h'); // 30 * 24 = 720
      });

      it('should return formatted duration, seconds are converted to minutes', () => {
        const companiDuration = CompaniDurationsHelper.CompaniDuration('PT2H742S');
        const result = companiDuration.format(HhMM);

        expect(result).toBe('2h12');
      });

      it('should return formatted duration with minutes, seconds have no effect under 60s', () => {
        const companiDuration = CompaniDurationsHelper.CompaniDuration('PT1H2M32.1S');
        const result = companiDuration.format(HhMM);

        expect(result).toBe('1h02');
      });

      it('should return formatted duration without minutes, seconds have no effect under 60s', () => {
        const companiDuration = CompaniDurationsHelper.CompaniDuration('PT1H32.1S');
        const result = companiDuration.format(HhMM);

        expect(result).toBe('1h');
      });
    });

    describe('HhMMmin', () => {
      it('should return formatted duration with minutes', () => {
        const companiDuration = CompaniDurationsHelper.CompaniDuration('PT5H16M');
        const result = companiDuration.format(HhMMmin);

        expect(result).toBe('5h 16min');
      });

      it('should return formatted duration with minutes, leading zero on minutes', () => {
        const companiDuration = CompaniDurationsHelper.CompaniDuration('PT5H3M');
        const result = companiDuration.format(HhMMmin);

        expect(result).toBe('5h 03min');
      });

      it('should return formatted duration without minutes', () => {
        const companiDuration = CompaniDurationsHelper.CompaniDuration('PT13H');
        const result = companiDuration.format(HhMMmin);

        expect(result).toBe('13h');
      });

      it('should return formatted duration without hours, leading zero on minutes', () => {
        const companiDuration = CompaniDurationsHelper.CompaniDuration('PT7M');
        const result = companiDuration.format(HhMMmin);

        expect(result).toBe('7min');
      });

      it('should return formatted duration without hours, leading zero on minutes', () => {
        const companiDuration = CompaniDurationsHelper.CompaniDuration('PT34M');
        const result = companiDuration.format(HhMMmin);

        expect(result).toBe('34min');
      });

      it('should return formatted duration, value is 0', () => {
        const companiDuration = CompaniDurationsHelper.CompaniDuration('PT0S');
        const result = companiDuration.format(HhMMmin);

        expect(result).toBe('0min');
      });

      it('should return formatted duration, days are converted to hours', () => {
        const companiDuration = CompaniDurationsHelper.CompaniDuration('P2DT1H');
        const result = companiDuration.format(HhMMmin);

        expect(result).toBe('49h');
      });

      it('should return formatted duration, month are converted to hours', () => {
        const companiDuration = CompaniDurationsHelper.CompaniDuration('P1M');
        const result = companiDuration.format(HhMMmin);

        expect(result).toBe('720h'); // 30 * 24 = 720
      });

      it('should return formatted duration, seconds are converted to minutes', () => {
        const companiDuration = CompaniDurationsHelper.CompaniDuration('PT2H742S');
        const result = companiDuration.format(HhMMmin);

        expect(result).toBe('2h 12min');
      });

      it('should return formatted duration with minutes, seconds have no effect under 60s', () => {
        const companiDuration = CompaniDurationsHelper.CompaniDuration('PT1H2M32.1S');
        const result = companiDuration.format(HhMMmin);

        expect(result).toBe('1h 02min');
      });

      it('should return formatted duration without minutes, seconds have no effect under 60s', () => {
        const companiDuration = CompaniDurationsHelper.CompaniDuration('PT1H32.1S');
        const result = companiDuration.format(HhMMmin);

        expect(result).toBe('1h');
      });
    });
  });

  describe('asHours', () => {
    it('should return duration in hours, with minutes', () => {
      const companiDuration = CompaniDurationsHelper.CompaniDuration('PT1H9M');
      const result = companiDuration.asHours();

      expect(result).toBe(1.15); // 1.15 = 1 + 9 / 60
    });

    it('should return duration in hours, with seconds', () => {
      const companiDuration = CompaniDurationsHelper.CompaniDuration('PT1H4S');
      const result = companiDuration.asHours();

      expect(result).toBe(1.001111111111111);
    });
  });

  describe('asSeconds', () => {
    it('should return duration in seconds', () => {
      const companiDuration = CompaniDurationsHelper.CompaniDuration('PT1H9M');
      const result = companiDuration.asSeconds();

      expect(result).toBe(4140);
    });
  });

  describe('toObject', () => {
    it('should return object from CompaniDuration', () => {
      const companiDuration = CompaniDurationsHelper.CompaniDuration('PT1H9M');
      const result = companiDuration.toObject();

      expect(result).toEqual({ hours: 1, minutes: 9 });
    });
  });

  describe('toISO', () => {
    it('should return ISO string if argument is ISO string', () => {
      const duration = 'PT2H30M';
      const result = CompaniDurationsHelper.CompaniDuration(duration).toISO();

      expect(result).toEqual(duration);
    });

    it('should return ISO string if argument is object', () => {
      const result = CompaniDurationsHelper.CompaniDuration({ hours: 2, minutes: 30 }).toISO();

      expect(result).toEqual('PT2H30M');
    });

    it('should return PT0S if no argument', () => {
      const result = CompaniDurationsHelper.CompaniDuration().toISO();

      expect(result).toEqual('PT0S');
    });

    it('should return PT0S if duration worths 0 month', () => {
      const result = CompaniDurationsHelper.CompaniDuration('P0M').toISO();

      expect(result).toEqual('PT0S');
    });
  });
});

describe('MANIPULATE', () => {
  describe('add', () => {
    let _formatMiscToCompaniDuration;
    const durationAmount = { hours: 1 };
    const companiDuration = CompaniDurationsHelper.CompaniDuration(durationAmount);

    beforeEach(() => {
      _formatMiscToCompaniDuration = sinon.spy(CompaniDurationsHelper, '_formatMiscToCompaniDuration');
    });

    afterEach(() => {
      _formatMiscToCompaniDuration.restore();
    });

    it('should increase a newly constructed companiDuration, increased by amount', () => {
      const addedAmount = { hours: 2, minutes: 5 };
      const result = companiDuration.add(addedAmount);

      expect(result).toEqual(expect.objectContaining({ _getDuration: expect.any(luxon.Duration) }));
      const amountInMs = (durationAmount.hours + addedAmount.hours) * 60 * 60 * 1000 + addedAmount.minutes * 60 * 1000;
      expect(result._getDuration.toMillis()).toBe(amountInMs);
      sinon.assert.calledWithExactly(_formatMiscToCompaniDuration.getCall(0), addedAmount);
    });
  });
});

describe('_formatMiscToCompaniDuration', () => {
  let fromObject;
  let fromMillis;
  let invalid;
  let fromISO;

  beforeEach(() => {
    fromObject = sinon.spy(luxon.Duration, 'fromObject');
    fromMillis = sinon.spy(luxon.Duration, 'fromMillis');
    invalid = sinon.spy(luxon.Duration, 'invalid');
    fromISO = sinon.spy(luxon.Duration, 'fromISO');
  });

  afterEach(() => {
    fromObject.restore();
    fromMillis.restore();
    invalid.restore();
    fromISO.restore();
  });

  it('should return duration being worth 0 if no args', () => {
    const result = CompaniDurationsHelper._formatMiscToCompaniDuration();

    expect(result instanceof luxon.Duration).toBe(true);
    expect(new luxon.Duration(result).toMillis()).toBe(0);
    sinon.assert.calledOnceWithExactly(fromObject, {});
    sinon.assert.notCalled(fromMillis);
    sinon.assert.notCalled(invalid);
  });

  it('should return duration if arg is object with duration', () => {
    const duration = luxon.Duration.fromMillis(123456789);
    const payload = { _getDuration: duration };
    const result = CompaniDurationsHelper._formatMiscToCompaniDuration(payload);

    expect(result instanceof luxon.Duration).toBe(true);
    expect(new luxon.Duration(result).toMillis()).toEqual(123456789);
    sinon.assert.calledOnceWithExactly(fromMillis, 123456789);
    sinon.assert.calledOnce(fromObject);
    sinon.assert.notCalled(invalid);
  });

  it('should return duration if arg is an object with luxon duration keys', () => {
    const payload = { hours: 3, minutes: 35, seconds: 12 };
    const result = CompaniDurationsHelper._formatMiscToCompaniDuration(payload);

    expect(result instanceof luxon.Duration).toBe(true);
    expect(result.toMillis()).toEqual(3 * 60 * 60 * 1000 + 35 * 60 * 1000 + 12 * 1000);
    sinon.assert.calledOnce(fromObject);
    sinon.assert.notCalled(invalid);
  });

  it('should return duration from iso', () => {
    const result = CompaniDurationsHelper.CompaniDuration('P1Y2M2DT3H4M2S');
    expect(result)
      .toEqual(expect.objectContaining({
        _getDuration: expect.any(luxon.Duration),
        format: expect.any(Function),
        add: expect.any(Function),
        asHours: expect.any(Function),
      }));
    expect(result.toObject()).toEqual({ years: 1, months: 2, days: 2, hours: 3, minutes: 4, seconds: 2 });
    sinon.assert.calledOnceWithExactly(fromISO, 'P1Y2M2DT3H4M2S');
  });

  it('should return error if invalid iso string', () => {
    try {
      CompaniDurationsHelper.CompaniDuration('P1Y2M2D3H4M2S');

      expect(true).toBe(false);
    } catch (e) {
      expect(e)
        .toEqual(new Error('Invalid Duration: unparsable: the input "P1Y2M2D3H4M2S" can\'t be parsed as ISO 8601'));
    } finally {
      sinon.assert.calledOnceWithExactly(fromISO, 'P1Y2M2D3H4M2S');
    }
  });

  it('should return invalid if wrong input', () => {
    try {
      CompaniDurationsHelper._formatMiscToCompaniDuration(23232323, 'minutes');
    } catch (e) {
      expect(e).toEqual(new Error('Invalid Duration: wrong arguments'));
    } finally {
      sinon.assert.calledOnceWithExactly(invalid, 'wrong arguments');
      sinon.assert.notCalled(fromObject);
      sinon.assert.notCalled(fromMillis);
    }
  });

  it('should return invalid if wrong unit in object input', () => {
    try {
      CompaniDurationsHelper._formatMiscToCompaniDuration({ wrong: 123 });
    } catch (e) {
      expect(e).toEqual(new Error('Invalid Duration: wrong arguments'));
    } finally {
      sinon.assert.calledOnceWithExactly(invalid, 'wrong arguments');
      sinon.assert.notCalled(fromObject);
      sinon.assert.notCalled(fromMillis);
    }
  });
});
