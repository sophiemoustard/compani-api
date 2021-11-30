const expect = require('expect');
const luxon = require('luxon');
const sinon = require('sinon');
const CompaniDurationsHelper = require('../../../../src/helpers/dates/companiDurations');

describe('CompaniDuration', () => {
  let _formatMiscToCompanyDuration;

  beforeEach(() => {
    _formatMiscToCompanyDuration = sinon.spy(CompaniDurationsHelper, '_formatMiscToCompanyDuration');
  });

  afterEach(() => {
    _formatMiscToCompanyDuration.restore();
  });

  it('should return duration', () => {
    const duration = 1200000000;

    const result = CompaniDurationsHelper.CompaniDuration(duration);

    expect(result)
      .toEqual(expect.objectContaining({ _duration: expect.any(luxon.Duration) }));
    sinon.assert.calledWithExactly(_formatMiscToCompanyDuration.getCall(0), duration);
  });
});

describe('_formatMiscToCompanyDuration', () => {
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
    const result = CompaniDurationsHelper._formatMiscToCompanyDuration(payload);

    expect(result instanceof luxon.Duration).toBe(true);
    expect(new luxon.Duration(result).toMillis()).toBe(payload);
    sinon.assert.calledOnceWithExactly(fromMillis, payload);
    sinon.assert.notCalled(invalid);
  });

  it('should return invalid if wrong input', () => {
    const result = CompaniDurationsHelper._formatMiscToCompanyDuration(23232323, 'minutes');

    expect(result instanceof luxon.Duration).toBe(true);
    sinon.assert.calledOnceWithExactly(invalid, 'wrong arguments');
    sinon.assert.notCalled(fromMillis);
  });
});
