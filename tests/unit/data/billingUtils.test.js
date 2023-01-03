const sinon = require('sinon');
const { expect } = require('expect');
const UtilsHelper = require('../../../src/helpers/utils');
const Utils = require('../../../src/data/pdf/billing/utils');

describe('formatBillingPrice', () => {
  let formatPrice;

  beforeEach(() => {
    formatPrice = sinon.stub(UtilsHelper, 'formatPrice');
  });

  afterEach(() => {
    formatPrice.restore();
  });

  it('should format price', async () => {
    const price = 12.24;

    formatPrice.returns('12,24 €');

    const result = await Utils.formatBillingPrice(price);

    expect(result).toEqual('12,24 €');
    sinon.assert.calledOnceWithExactly(formatPrice, 12.24);
  });

  it('should return \'-\' if price is null or undefined', async () => {
    const price = null;

    const result = await Utils.formatBillingPrice(price);

    expect(result).toEqual('-');
    sinon.assert.notCalled(formatPrice);
  });
});
