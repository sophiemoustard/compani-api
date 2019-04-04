const expect = require('expect');

const {
  formatBillNumber,
  formatCustomerBills,
  formatThirdPartyPayerBills,
} = require('../../../helpers/bills');

describe('formatBillNumber', () => {
  it('should return the correct bill number', () => {
    expect(formatBillNumber('toto', 5)).toEqual('toto-005');
    expect(formatBillNumber('toto', 345)).toEqual('toto-345');
  });
});

describe('formatCustomerBills', () => {
  it('Case 1 : 1 bill', () => {
    const customer = { _id: 'lilalo' };
    const number = { prefix: 'Picsou', seq: 77 };
    const customerBills = {
      bills: [{
        subscription: { _id: 'asd' },
        unitExclTaxes: 24.644549763033176,
        exclTaxes: 13.649289099526067,
        inclTaxes: 14.4,
        hours: 1.5,
        eventsList: [
          { event: '123', inclTaxesTpp: 14.4 },
          { event: '456', inclTaxesTpp: 12 },
        ],
      }] 
    };

    const result = formatCustomerBills(customerBills, customer, number);
    expect(result).toBeDefined();
    expect(result.bill).toBeDefined();
    expect(result.bill).toMatchObject({
      customer: 'lilalo',
      billNumber: 'Picsou-077',
      subscriptions: [{
        subscription: 'asd',
        unitExclTaxes: 24.644549763033176,
        exclTaxes: 13.649289099526067,
        inclTaxes: 14.4,
        hours: 1.5,
        events: ['123', '456'],
      }],
    });
    expect(result.billedEvents).toBeDefined();
    expect(result.billedEvents).toMatchObject({
      '123': { event: '123', inclTaxesTpp: 14.4 },
      '456': { event: '456', inclTaxesTpp: 12 },
    });
  });

  it('Case 2 : multiple bills', () => {
    const customer = { _id: 'lilalo' };
    const number = { prefix: 'Picsou', seq: 77 };
    const customerBills = {
      bills: [{
        subscription: { _id: 'asd' },
        unitExclTaxes: 24.644549763033176,
        exclTaxes: 13.649289099526067,
        inclTaxes: 14.4,
        hours: 1.5,
        eventsList: [
          { event: '123', inclTaxesTpp: 14.4 },
          { event: '456', inclTaxesTpp: 12 },
        ],
      }, {
        subscription: { _id: 'fgh' },
        unitExclTaxes: 34,
        exclTaxes: 15,
        inclTaxes: 11,
        hours: 5,
        eventsList: [
          { event: '890', inclTaxesTpp: 45 },
          { event: '736', inclTaxesTpp: 23 },
        ],
      }] 
    };

    const result = formatCustomerBills(customerBills, customer, number);
    expect(result).toBeDefined();
    expect(result.bill).toBeDefined();
    expect(result.bill).toMatchObject({
      customer: 'lilalo',
      billNumber: 'Picsou-077',
      subscriptions: [{
        subscription: 'asd',
        unitExclTaxes: 24.644549763033176,
        exclTaxes: 13.649289099526067,
        inclTaxes: 14.4,
        hours: 1.5,
        events: ['123', '456'],
      }, {
        subscription: 'fgh',
        unitExclTaxes: 34,
        exclTaxes: 15,
        inclTaxes: 11,
        hours: 5,
        events: ['890', '736'],
      }],
    });
    expect(result.billedEvents).toBeDefined();
    expect(result.billedEvents).toMatchObject({
      '123': { event: '123', inclTaxesTpp: 14.4 },
      '456': { event: '456', inclTaxesTpp: 12 },
      '890': { event: '890', inclTaxesTpp: 45 },
      '736': { event: '736', inclTaxesTpp: 23 }
    });
  });
});

describe('formatThirdPartyPayerBills', () => {
  it('Case 1 : 1 third party payer - 1 bill', () => {
    const customer = { _id: 'lilalo' };
    const number = { prefix: 'Picsou', seq: 77 };
    const thirdPartyPayerBills = [{
      bills: [{
        thirdPartyPayer: 'Papa',
        subscription: { _id: 'asd' },
        unitExclTaxes: 24.644549763033176,
        exclTaxes: 13.649289099526067,
        inclTaxes: 14.4,
        hours: 1.5,
        eventsList: [
          { event: '123', inclTaxesTpp: 14.4, history: { fundingVersion: 'fund', careHours: 4 } },
          { event: '456', inclTaxesTpp: 12, history: { fundingVersion: 'fund', careHours: 2 } },
        ],
      }] 
    }];

    const result = formatThirdPartyPayerBills(thirdPartyPayerBills, customer, number);
    expect(result).toBeDefined();
    expect(result.tppBills).toBeDefined();
    expect(result.tppBills[0]).toMatchObject({
      customer: 'lilalo',
      billNumber: 'Picsou-077',
      client: 'Papa',
      subscriptions: [{
        subscription: 'asd',
        unitExclTaxes: 24.644549763033176,
        exclTaxes: 13.649289099526067,
        inclTaxes: 14.4,
        hours: 1.5,
        events: ['123', '456'],
      }],
    });
    expect(result.billedEvents).toBeDefined();
    expect(result.billedEvents).toMatchObject({
      '123': { event: '123', inclTaxesTpp: 14.4 },
      '456': { event: '456', inclTaxesTpp: 12 },
    });
    expect(result.fundingHistories).toBeDefined();
    expect(result.fundingHistories).toMatchObject({
      'fund': { fundingVersion: 'fund', careHours: 6 },
    });
  });

  it('Case 2 : 1 third party payer - multiple bills', () => {
    const customer = { _id: 'lilalo' };
    const number = { prefix: 'Picsou', seq: 77 };
    const thirdPartyPayerBills = [{
      bills: [{
        thirdPartyPayer: 'Papa',
        subscription: { _id: 'asd' },
        unitExclTaxes: 24.644549763033176,
        exclTaxes: 13.649289099526067,
        inclTaxes: 14.4,
        hours: 1.5,
        eventsList: [
          { event: '123', inclTaxesTpp: 14.4, history: { fundingVersion: 'fund', careHours: 2 } },
          { event: '456', inclTaxesTpp: 12, history: { fundingVersion: 'lio', careHours: 4 } },
        ],
      }, {
        thirdPartyPayer: 'Papa',
        subscription: { _id: 'fgh' },
        unitExclTaxes: 34,
        exclTaxes: 15,
        inclTaxes: 11,
        hours: 5,
        eventsList: [
          { event: '890', inclTaxesTpp: 45, history: { fundingVersion: 'fund', careHours: 4.5 } },
          { event: '736', inclTaxesTpp: 23, history: { fundingVersion: 'fund', careHours: 1 } },
        ],
      }] 
    }];

    const result = formatThirdPartyPayerBills(thirdPartyPayerBills, customer, number);
    expect(result).toBeDefined();
    expect(result.tppBills).toBeDefined();
    expect(result.tppBills[0]).toMatchObject({
      customer: 'lilalo',
      billNumber: 'Picsou-077',
      client: 'Papa',
      subscriptions: [{
        subscription: 'asd',
        unitExclTaxes: 24.644549763033176,
        exclTaxes: 13.649289099526067,
        inclTaxes: 14.4,
        hours: 1.5,
        events: ['123', '456'],
      }, {
        subscription: 'fgh',
        unitExclTaxes: 34,
        exclTaxes: 15,
        inclTaxes: 11,
        hours: 5,
        events: ['890', '736'],
      }],
    });
    expect(result.billedEvents).toBeDefined();
    expect(result.billedEvents).toMatchObject({
      '123': { event: '123', inclTaxesTpp: 14.4 },
      '456': { event: '456', inclTaxesTpp: 12 },
      '890': { event: '890', inclTaxesTpp: 45 },
      '736': { event: '736', inclTaxesTpp: 23 },
    });
    expect(result.fundingHistories).toBeDefined();
    expect(result.fundingHistories).toMatchObject({
      'fund': { fundingVersion: 'fund', careHours: 7.5 },
      'lio': { fundingVersion: 'lio', careHours: 4 },
    });
  });

  it('Case 3 : multiple third party payers', () => {
    const customer = { _id: 'lilalo' };
    const number = { prefix: 'Picsou', seq: 77 };
    const thirdPartyPayerBills = [{
      bills: [{
        thirdPartyPayer: 'Papa',
        subscription: { _id: 'asd' },
        unitExclTaxes: 24.644549763033176,
        exclTaxes: 13.649289099526067,
        inclTaxes: 14.4,
        hours: 1.5,
        eventsList: [
          { event: '123', inclTaxesTpp: 14.4, history: { fundingVersion: 'fund', careHours: 2 } },
          { event: '456', inclTaxesTpp: 12, history: { fundingVersion: 'lio', careHours: 4 } },
        ],
      }]
    }, {
      bills: [{
        thirdPartyPayer: 'Papa',
        subscription: { _id: 'fgh' },
        unitExclTaxes: 34,
        exclTaxes: 15,
        inclTaxes: 11,
        hours: 5,
        eventsList: [
          { event: '890', inclTaxesTpp: 45, history: { fundingVersion: 'fund', careHours: 4.5 } },
          { event: '736', inclTaxesTpp: 23, history: { fundingVersion: 'fund', careHours: 1 } },
        ],
      }] 
    }];

    const result = formatThirdPartyPayerBills(thirdPartyPayerBills, customer, number);
    expect(result).toBeDefined();
    expect(result.tppBills).toBeDefined();
    expect(result.tppBills.length).toEqual(2);
  });
});
