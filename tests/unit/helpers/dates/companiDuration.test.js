const expect = require('expect');
const luxon = require('luxon');
const sinon = require('sinon');
const CompaniDurationsHelper = require('../../../../src/helpers/dates/companiDurations');

describe('CompaniDuration', () => {
  let _formatMiscToCompaniDuration;

  beforeEach(() => {
    _formatMiscToCompaniDuration = sinon.spy(CompaniDurationsHelper, '_formatMiscToCompaniDuration');
  });

  afterEach(() => {
    _formatMiscToCompaniDuration.restore();
  });

  it('should return duration', () => {
    const duration = 1200000000;

    const result = CompaniDurationsHelper.CompaniDuration(duration);

    expect(result)
      .toEqual(expect.objectContaining({ _duration: expect.any(luxon.Duration), format: expect.any(Function) }));
    sinon.assert.calledWithExactly(_formatMiscToCompaniDuration.getCall(0), duration);
  });
});

describe('format', () => {
  let _formatMiscToCompaniDuration;

  beforeEach(() => {
    _formatMiscToCompaniDuration = sinon.spy(CompaniDurationsHelper, '_formatMiscToCompaniDuration');
  });

  afterEach(() => {
    _formatMiscToCompaniDuration.restore();
  });

  it('should return formatted duration with minutes', () => {
    const durationAmount = 5 * 60 * 60 * 1000 + 16 * 60 * 1000;
    const companiDuration = CompaniDurationsHelper.CompaniDuration(durationAmount);
    const result = companiDuration.format();

    expect(result).toBe('5h16');
  });

  it('should return formatted duration with minutes, leading zero on minutes', () => {
    const durationAmount = 5 * 60 * 60 * 1000 + 3 * 60 * 1000;
    const companiDuration = CompaniDurationsHelper.CompaniDuration(durationAmount);
    const result = companiDuration.format();

    expect(result).toBe('5h03');
  });

  it('should return formatted duration without minutes', () => {
    const durationAmount = 13 * 60 * 60 * 1000;
    const companiDuration = CompaniDurationsHelper.CompaniDuration(durationAmount);
    const result = companiDuration.format();

    expect(result).toBe('13h');
  });

  it('should return formatted duration, days are converted to hours', () => {
    const durationAmount = 2 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000;
    const companiDuration = CompaniDurationsHelper.CompaniDuration(durationAmount);
    const result = companiDuration.format();

    expect(result).toBe('49h');
  });

  it('should return formatted duration with minutes, seconds and milliseconds have no effect', () => {
    const durationAmount = 1 * 60 * 60 * 1000 + 2 * 60 * 1000 + 30 * 1000 + 400;
    const companiDuration = CompaniDurationsHelper.CompaniDuration(durationAmount);
    const result = companiDuration.format();

    expect(result).toBe('1h02');
  });

  it('should return formatted duration without minutes, seconds and milliseconds have no effect', () => {
    const durationAmount = 1 * 60 * 60 * 1000 + 55 * 1000 + 900;
    const companiDuration = CompaniDurationsHelper.CompaniDuration(durationAmount);
    const result = companiDuration.format();

    expect(result).toBe('1h');
  });
});

describe('_formatMiscToCompaniDuration', () => {
  let fromMillis;
  let invalid;

  beforeEach(() => {
    fromMillis = sinon.spy(luxon.Duration, 'fromMillis');
    invalid = sinon.spy(luxon.Duration, 'invalid');
  });

  afterEach(() => {
    fromMillis.restore();
    invalid.restore();
  });

  it('should return duration if arg is number', () => {
    const payload = 3000000000;
    const result = CompaniDurationsHelper._formatMiscToCompaniDuration(payload);

    expect(result instanceof luxon.Duration).toBe(true);
    expect(new luxon.Duration(result).toMillis()).toBe(payload);
    sinon.assert.calledOnceWithExactly(fromMillis, payload);
    sinon.assert.notCalled(invalid);
  });

  it('should return invalid if wrong input', () => {
    const result = CompaniDurationsHelper._formatMiscToCompaniDuration(23232323, 'minutes');

    expect(result instanceof luxon.Duration).toBe(true);
    sinon.assert.calledOnceWithExactly(invalid, 'wrong arguments');
    sinon.assert.notCalled(fromMillis);
  });
});
