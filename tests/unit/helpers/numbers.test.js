const expect = require('expect');
const NumbersHelper = require('../../../src/helpers/numbers');

describe('multiply', () => {
  it('should multiply numbers', async () => {
    const result = NumbersHelper.multiply(0.1, 2, 0.2);

    expect(result).toEqual(0.04);
  });
});

describe('dividedBy', () => {
  it('should divid numbers', async () => {
    const result = NumbersHelper.divide(0.3, 0.2);

    expect(result).toEqual(1.5);
  });
});

describe('add', () => {
  it('should add numbers', async () => {
    const result = NumbersHelper.add(0.6, 0.3, 1.2);

    expect(result).toEqual(2.1);
  });
});

describe('subsdtract', () => {
  it('should subtract numbers', async () => {
    const result = NumbersHelper.subtract(0.7, 0.2);

    expect(result).toEqual(0.5);
  });
});
