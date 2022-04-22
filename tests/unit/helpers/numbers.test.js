const expect = require('expect');
const NumbersHelper = require('../../../src/helpers/numbers');

describe('oldMultiply', () => {
  it('should multiply numbers', async () => {
    const result = NumbersHelper.oldMultiply(0.1, 2, 0.2);

    expect(result).toEqual(0.04);
  });
});

describe('divide', () => {
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

describe('subtract', () => {
  it('should subtract numbers', async () => {
    const result = NumbersHelper.subtract(0.7, 0.2);

    expect(result).toEqual(0.5);
  });
});
