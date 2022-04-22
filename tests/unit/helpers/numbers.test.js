const expect = require('expect');
const NumbersHelper = require('../../../src/helpers/numbers');

describe('oldMultiply', () => {
  it('should multiply numbers', async () => {
    const result = NumbersHelper.oldMultiply(0.1, 2, 0.2);

    expect(result).toEqual(0.04);
  });
});

describe('oldDivide', () => {
  it('should divide numbers', async () => {
    const result = NumbersHelper.oldDivide(0.3, 0.2);

    expect(result).toEqual(1.5);
  });
});

describe('oldAdd', () => {
  it('should add numbers', async () => {
    const result = NumbersHelper.oldAdd(0.6, 0.3, 1.2);

    expect(result).toEqual(2.1);
  });
});

describe('oldSubtract', () => {
  it('should subtract numbers', async () => {
    const result = NumbersHelper.oldSubtract(0.7, 0.2);

    expect(result).toEqual(0.5);
  });
});
