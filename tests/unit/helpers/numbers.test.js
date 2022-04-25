const { BigNumber } = require('bignumber.js');
const expect = require('expect');
const NumbersHelper = require('../../../src/helpers/numbers');

describe('toBN', () => {
  it('should multiply numbers', async () => {
    const result = NumbersHelper.toBN(0.1);

    expect(BigNumber.isBigNumber(result)).toBeTruthy();
    expect(result.toString()).toEqual('0.1');
  });
});

describe('oldMultiply', () => {
  it('should multiply numbers', async () => {
    const result = NumbersHelper.oldMultiply(0.1, 2, 0.2);

    expect(result).toEqual(0.04);
  });
});

describe('multiply', () => {
  it('should multiply number', () => {
    const result = NumbersHelper.multiply(0.1, 2, 0.2);

    expect(result).toEqual('0.04');
  });
});

describe('oldDivide', () => {
  it('should divide numbers', async () => {
    const result = NumbersHelper.oldDivide(0.3, 0.2);

    expect(result).toEqual(1.5);
  });
});

describe('divide', () => {
  it('should divide numbers', async () => {
    const result = NumbersHelper.divide(0.3, 0.2);

    expect(result).toEqual('1.5');
  });
});

describe('oldAdd', () => {
  it('should add numbers', async () => {
    const result = NumbersHelper.oldAdd(0.6, 0.3, 1.2);

    expect(result).toEqual(2.1);
  });
});

describe('add', () => {
  it('should add numbers', async () => {
    const result = NumbersHelper.add(0.6, 0.3, 1.2);

    expect(result).toEqual('2.1');
  });
});

describe('oldSubtract', () => {
  it('should subtract numbers', async () => {
    const result = NumbersHelper.oldSubtract(0.7, 0.2);

    expect(result).toEqual(0.5);
  });
});

describe('subtract', () => {
  it('should subtract numbers', async () => {
    const result = NumbersHelper.subtract(0.7, 0.2);

    expect(result).toEqual('0.5');
  });
});
