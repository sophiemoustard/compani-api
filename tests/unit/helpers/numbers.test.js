const expect = require('expect');
const NumberHelper = require('../../../src/helpers/numbers');

describe('multiply', () => {
  it('should multiply numbers', async () => {
    const a = 0.1;
    const b = 0.2;

    const result = NumberHelper.multiply(a, b);

    expect(result).toEqual(0.02);
  });
});

describe('dividedBy', () => {
  it('should divid numbers', async () => {
    const a = 0.3;
    const b = 0.2;

    const result = NumberHelper.divideBy(a, b);

    expect(result).toEqual(1.5);
  });
});

describe('add', () => {
  it('should add numbers', async () => {
    const a = 0.6;
    const b = 1.2;

    const result = NumberHelper.add(a, b);

    expect(result).toEqual(1.8);
  });
});

describe('subsdtract', () => {
  it('should substract numbers', async () => {
    const a = 0.7;
    const b = 0.2;

    const result = NumberHelper.substract(a, b);

    expect(result).toEqual(0.5);
  });
});
