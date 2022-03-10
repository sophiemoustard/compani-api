const expect = require('expect');
const UtilsValidation = require('../../../src/routes/validations/utils');
const { CompaniDate } = require('../../../src/helpers/dates/companiDates');

describe('dateToISOString', () => {
  it('should accept dateJS and return complete ISO string', async () => {
    const payload = new Date('2022-03-07T07:00:00.000Z');

    const result = UtilsValidation.dateToISOString.validate(payload);
    expect(result.error).toBeFalsy();
    expect(result.value).toBe('2022-03-07T07:00:00.000Z');
  });

  it('should accept stringed dateJS', async () => {
    const dateJS = new Date('2022-03-07T07:00:00.000Z');
    const payload = dateJS.toString(); // Mon Mar 07 2022 08:00:00 GMT+0100 (heure normale d’Europe centrale)

    const result = UtilsValidation.dateToISOString.validate(payload);
    expect(result.error).toBeFalsy();
    expect(result.value).toBe('2022-03-07T07:00:00.000Z');
  });

  it('should accept complete ISO string', async () => {
    const payload = '2022-03-07T07:00:00.000Z';

    const result = UtilsValidation.dateToISOString.validate(payload);
    expect(result.error).toBeFalsy();
    expect(result.value).toBe('2022-03-07T07:00:00.000Z');
  });

  it('should accept incomplete ISO string', async () => {
    const payload = '2022-03-07T07:00Z';

    const result = UtilsValidation.dateToISOString.validate(payload);
    expect(result.error).toBeFalsy();
    expect(result.value).toBe('2022-03-07T07:00:00.000Z');
  });

  it('should accept date in miliseconds', async () => {
    const payload = 1646636400000;

    const result = UtilsValidation.dateToISOString.validate(payload);
    expect(result.error).toBeFalsy();
    expect(result.value).toBe('2022-03-07T07:00:00.000Z');
  });

  it('should accept US commun format "MM/DD/YYYY"', async () => {
    const payload = '03/07/2022';

    const result = UtilsValidation.dateToISOString.validate(payload);
    expect(result.error).toBeFalsy();
    expect(CompaniDate(result.value).isSame('2022-03-07', 'day')).toBeTruthy();
  });

  it('should not accept unexisting date', async () => {
    const payload = '2022-03-32T23:00:00.000Z';

    const result = UtilsValidation.dateToISOString.validate(payload);
    expect(result.error).toBeTruthy();
    expect(result.error.message.startsWith('"value" must be a valid date')).toBeTruthy();
  });
});

describe('requiredDateToISOString', () => {
  it('should accept dateJS and return complete ISO string', async () => {
    const payload = new Date('2022-03-07T07:00:00.000Z');

    const result = UtilsValidation.requiredDateToISOString.validate(payload);
    expect(result.error).toBeFalsy();
    expect(result.value).toBe('2022-03-07T07:00:00.000Z');
  });

  it('should accept stringed dateJS', async () => {
    const dateJS = new Date('2022-03-07T07:00:00.000Z');
    const payload = dateJS.toString(); // Mon Mar 07 2022 08:00:00 GMT+0100 (heure normale d’Europe centrale)

    const result = UtilsValidation.requiredDateToISOString.validate(payload);
    expect(result.error).toBeFalsy();
    expect(result.value).toBe('2022-03-07T07:00:00.000Z');
  });

  it('should accept complete ISO string', async () => {
    const payload = '2022-03-07T07:00:00.000Z';

    const result = UtilsValidation.requiredDateToISOString.validate(payload);
    expect(result.error).toBeFalsy();
    expect(result.value).toBe('2022-03-07T07:00:00.000Z');
  });

  it('should accept incomplete ISO string', async () => {
    const payload = '2022-03-07T07:00Z';

    const result = UtilsValidation.requiredDateToISOString.validate(payload);
    expect(result.error).toBeFalsy();
    expect(result.value).toBe('2022-03-07T07:00:00.000Z');
  });

  it('should accept date in miliseconds', async () => {
    const payload = 1646636400000;

    const result = UtilsValidation.requiredDateToISOString.validate(payload);
    expect(result.error).toBeFalsy();
    expect(result.value).toBe('2022-03-07T07:00:00.000Z');
  });

  it('should accept US commun format "MM/DD/YYYY"', async () => {
    const payload = '03/07/2022';

    const result = UtilsValidation.requiredDateToISOString.validate(payload);
    expect(result.error).toBeFalsy();
    expect(CompaniDate(result.value).isSame('2022-03-07', 'day')).toBeTruthy();
  });

  it('should not accept unexisting date', async () => {
    const payload = '2022-03-32T23:00:00.000Z';

    const result = UtilsValidation.requiredDateToISOString.validate(payload);
    expect(result.error).toBeTruthy();
    expect(result.error.message.startsWith('"value" must be a valid date')).toBeTruthy();
  });
});

describe('isNotEmpty', () => {
  it('should return value if payload exist', async () => {
    const payload = 'skusku';

    const result = UtilsValidation.isNotEmpty.validate(payload);

    expect(result.error).toBeFalsy();
    expect(result.value).toBe('skusku');
  });

  it('should return undefined if payload is undefined', async () => {
    const payload = undefined;

    const result = UtilsValidation.isNotEmpty.validate(payload);

    expect(result.error).toBeTruthy();
    expect(result.value).toBe(undefined);
  });

  it('should return undefined if payload is empty string', async () => {
    const payload = '';

    const result = UtilsValidation.isNotEmpty.validate(payload);

    expect(result.error).toBeTruthy();
    expect(result.value).toBe(undefined);
  });
});
