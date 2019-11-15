const expect = require('expect');
const sinon = require('sinon');

const Pay = require('../../../src/models/Pay');
const FinalPay = require('../../../src/models/FinalPay');
const PayHelper = require('../../../src/helpers/pay');
const UtilsHelper = require('../../../src/helpers/utils');

require('sinon-mongoose');

describe('formatSurchargeDetail', () => {
  it('should return empty array if empty object given', () => {
    const result = PayHelper.formatSurchargeDetail({});
    expect(result).toEqual([]);
  });

  it('should format surcharge detail', () => {
    const detail = {
      1234567890: { toto: 2, tata: 3 },
      qwertyuiop: { pay: 7, contract: 9 },
    };
    const result = PayHelper.formatSurchargeDetail(detail);
    expect(result).toEqual([
      { planId: '1234567890', toto: 2, tata: 3 },
      { planId: 'qwertyuiop', pay: 7, contract: 9 },
    ]);
  });
});

describe('formatPay', () => {
  let formatSurchargeDetail;
  beforeEach(() => {
    formatSurchargeDetail = sinon.stub(PayHelper, 'formatSurchargeDetail');
  });
  afterEach(() => {
    formatSurchargeDetail.restore();
  });

  it('return empty object if empty object given', () => {
    const result = PayHelper.formatPay({});
    expect(result).toEqual({});
  });

  it('should format pay with surchargedAndExemptDetails', () => {
    const draftPay = { _id: 'toto', surchargedAndExemptDetails: { evenings: 3 } };
    formatSurchargeDetail.returns({ test: 1 });

    const result = PayHelper.formatPay(draftPay);
    expect(result).toEqual({
      _id: 'toto',
      surchargedAndExemptDetails: { test: 1 },
    });
    sinon.assert.callCount(formatSurchargeDetail, 1);
  });

  it('should format pay with diff', () => {
    const draftPay = { _id: 'toto', diff: { surchargedAndExemptDetails: { evenings: 3 } } };
    formatSurchargeDetail.returns({ test: 1 });

    const result = PayHelper.formatPay(draftPay);
    expect(result).toEqual({
      _id: 'toto',
      diff: { surchargedAndExemptDetails: { test: 1 } },
    });
    sinon.assert.callCount(formatSurchargeDetail, 1);
  });

  it('should format pay with dibothff', () => {
    const draftPay = {
      _id: 'toto',
      diff: { surchargedAndExemptDetails: { evenings: 3 } },
      surchargedAndExemptDetails: { custom: 3 },
    };
    formatSurchargeDetail.returns({ test: 1 });

    const result = PayHelper.formatPay(draftPay);
    expect(result).toEqual({
      _id: 'toto',
      diff: { surchargedAndExemptDetails: { test: 1 } },
      surchargedAndExemptDetails: { test: 1 },
    });
    sinon.assert.callCount(formatSurchargeDetail, 2);
  });
});
