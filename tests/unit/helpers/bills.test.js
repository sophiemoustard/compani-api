const expect = require('expect');
const moment = require('moment');

const {
  formatBillNumber,
  formatCustomerBills,
  formatThirdPartyPayerBills,
} = require('../../../helpers/bills');

describe('formatBillNumber', () => {
  it('should return the correct bill number', () => {
    expect(formatBillNumber('toto', 5)).toEqual('toto005');
    expect(formatBillNumber('toto', 345)).toEqual('toto345');
  });
});

describe('formatCustomerBills', () => {
  it('Case 1 : 1 bill', () => {
    const customer = { _id: 'lilalo' };
    const number = { prefix: 'Picsou', seq: 77 };
    const customerBills = {
      bills: [{
        subscription: { _id: 'asd', service: { versions: [{ vat: 12, startDate: moment().toISOString(), }] } },
        unitExclTaxes: 24.644549763033176,
        exclTaxes: 13.649289099526067,
        inclTaxes: 14.4,
        startDate: moment().add(1, 'd').toISOString(),
        hours: 1.5,
        eventsList: [
          { event: '123', inclTaxesTpp: 14.4 },
          { event: '456', inclTaxesTpp: 12 },
        ],
      }],
      total: 14.4,
    };

    const result = formatCustomerBills(customerBills, customer, number);
    expect(result).toBeDefined();
    expect(result.bill).toBeDefined();
    expect(result.bill).toMatchObject({
      customer: 'lilalo',
      billNumber: 'Picsou077',
      subscriptions: [{
        subscription: 'asd',
        unitExclTaxes: 24.644549763033176,
        exclTaxes: 13.649289099526067,
        inclTaxes: 14.4,
        hours: 1.5,
        events: ['123', '456'],
        vat: 12,
      }],
    });

    expect(result.billedEvents).toBeDefined();
    expect(result.billedEvents).toMatchObject({
      123: { event: '123', inclTaxesTpp: 14.4 },
      456: { event: '456', inclTaxesTpp: 12 },
    });
  });

  it('Case 2 : multiple bills', () => {
    const customer = { _id: 'lilalo' };
    const number = { prefix: 'Picsou', seq: 77 };
    const customerBills = {
      total: 14.4,
      bills: [{
        subscription: { _id: 'asd', service: { versions: [{ vat: 12, startDate: moment().toISOString(), }] } },
        unitExclTaxes: 24.644549763033176,
        exclTaxes: 13.649289099526067,
        inclTaxes: 14.4,
        hours: 1.5,
        startDate: moment().add(1, 'd').toISOString(),
        eventsList: [
          { event: '123', inclTaxesTpp: 14.4 },
          { event: '456', inclTaxesTpp: 12 },
        ],
      }, {
        subscription: { _id: 'fgh', service: { versions: [{ vat: 34, startDate: moment().toISOString(), }] } },
        unitExclTaxes: 34,
        exclTaxes: 15,
        inclTaxes: 11,
        hours: 5,
        startDate: moment().add(1, 'd').toISOString(),
        eventsList: [
          { event: '890', inclTaxesTpp: 45 },
          { event: '736', inclTaxesTpp: 23 },
        ],
      }],
    };

    const result = formatCustomerBills(customerBills, customer, number);
    expect(result).toBeDefined();
    expect(result.bill).toBeDefined();
    expect(result.bill).toMatchObject({
      customer: 'lilalo',
      billNumber: 'Picsou077',
      subscriptions: [{
        subscription: 'asd',
        unitExclTaxes: 24.644549763033176,
        exclTaxes: 13.649289099526067,
        inclTaxes: 14.4,
        hours: 1.5,
        events: ['123', '456'],
        vat: 12
      }, {
        subscription: 'fgh',
        unitExclTaxes: 34,
        exclTaxes: 15,
        inclTaxes: 11,
        hours: 5,
        events: ['890', '736'],
        vat: 34,
      }],
    });
    expect(result.billedEvents).toBeDefined();
    expect(result.billedEvents).toMatchObject({
      123: { event: '123', inclTaxesTpp: 14.4 },
      456: { event: '456', inclTaxesTpp: 12 },
      890: { event: '890', inclTaxesTpp: 45 },
      736: { event: '736', inclTaxesTpp: 23 }
    });
  });
});

describe('formatThirdPartyPayerBills', () => {
  it('Case 1 : 1 third party payer - 1 bill - Funding monthly and hourly', () => {
    const customer = { _id: 'lilalo' };
    const number = { prefix: 'Picsou', seq: 77 };
    const thirdPartyPayerBills = [{
      total: 14.4,
      bills: [{
        thirdPartyPayer: 'Papa',
        subscription: { _id: 'asd', service: { versions: [{ vat: 12, startDate: moment().toISOString(), }] } },
        unitExclTaxes: 24.644549763033176,
        startDate: moment().add(1, 'd').toISOString(),
        exclTaxes: 13.649289099526067,
        inclTaxes: 14.4,
        hours: 1.5,
        eventsList: [
          { event: '123', inclTaxesTpp: 14.4, history: { fundingVersion: 'fund', careHours: 4, month: '02/2019', nature: 'hourly' } },
          { event: '456', inclTaxesTpp: 12, history: { fundingVersion: 'fund', careHours: 2, month: '03/2019', nature: 'hourly' } },
        ],
      }],
    }];

    const result = formatThirdPartyPayerBills(thirdPartyPayerBills, customer, number);
    expect(result).toBeDefined();
    expect(result.tppBills).toBeDefined();
    expect(result.tppBills[0]).toMatchObject({
      customer: 'lilalo',
      billNumber: 'Picsou077',
      client: 'Papa',
      subscriptions: [{
        subscription: 'asd',
        unitExclTaxes: 24.644549763033176,
        exclTaxes: 13.649289099526067,
        inclTaxes: 14.4,
        hours: 1.5,
        events: ['123', '456'],
        vat: 12,
      }],
    });
    expect(result.billedEvents).toBeDefined();
    expect(result.billedEvents).toMatchObject({
      123: { event: '123', inclTaxesTpp: 14.4 },
      456: { event: '456', inclTaxesTpp: 12 },
    });
    expect(result.fundingHistories).toBeDefined();
    expect(result.fundingHistories).toMatchObject({
      fund: {
        '02/2019': { careHours: 4, fundingVersion: 'fund', month: '02/2019', nature: 'hourly' },
        '03/2019': { careHours: 2, fundingVersion: 'fund', month: '03/2019', nature: 'hourly' },
      }
    });
  });

  it('Case 2 : 1 third party payer - 1 bill - Funding once and hourly', () => {
    const customer = { _id: 'lilalo' };
    const number = { prefix: 'Picsou', seq: 77 };
    const thirdPartyPayerBills = [{
      total: 14.4,
      bills: [{
        thirdPartyPayer: 'Papa',
        subscription: { _id: 'asd', service: { versions: [{ vat: 12, startDate: moment().toISOString(), }] } },
        unitExclTaxes: 24.644549763033176,
        startDate: moment().add(1, 'd').toISOString(),
        exclTaxes: 13.649289099526067,
        inclTaxes: 14.4,
        hours: 1.5,
        eventsList: [
          { event: '123', inclTaxesTpp: 14.4, history: { fundingVersion: 'fund', careHours: 4, nature: 'hourly' } },
          { event: '456', inclTaxesTpp: 12, history: { fundingVersion: 'fund', careHours: 2, nature: 'hourly' } },
        ],
      }],
    }];

    const result = formatThirdPartyPayerBills(thirdPartyPayerBills, customer, number);
    expect(result).toBeDefined();
    expect(result.tppBills).toBeDefined();
    expect(result.tppBills[0]).toMatchObject({
      customer: 'lilalo',
      billNumber: 'Picsou077',
      client: 'Papa',
      subscriptions: [{
        subscription: 'asd',
        unitExclTaxes: 24.644549763033176,
        exclTaxes: 13.649289099526067,
        inclTaxes: 14.4,
        hours: 1.5,
        events: ['123', '456'],
        vat: 12,
      }],
    });
    expect(result.billedEvents).toBeDefined();
    expect(result.billedEvents).toMatchObject({
      123: { event: '123', inclTaxesTpp: 14.4 },
      456: { event: '456', inclTaxesTpp: 12 },
    });
    expect(result.fundingHistories).toBeDefined();
    expect(result.fundingHistories).toMatchObject({
      fund: { careHours: 6, fundingVersion: 'fund', nature: 'hourly' },
    });
  });


  it('Case 3 : 1 third party payer - 1 bill - Funding once and fixed', () => {
    const customer = { _id: 'lilalo' };
    const number = { prefix: 'Picsou', seq: 77 };
    const thirdPartyPayerBills = [{
      total: 14.4,
      bills: [{
        thirdPartyPayer: 'Papa',
        subscription: { _id: 'asd', service: { versions: [{ vat: 12, startDate: moment().toISOString(), }] } },
        unitExclTaxes: 24.644549763033176,
        startDate: moment().add(1, 'd').toISOString(),
        exclTaxes: 13.649289099526067,
        inclTaxes: 14.4,
        hours: 1.5,
        eventsList: [
          { event: '123', inclTaxesTpp: 14.4, history: { fundingVersion: 'fund', amountTTC: 40, nature: 'fixed' } },
          { event: '456', inclTaxesTpp: 12, history: { fundingVersion: 'fund', amountTTC: 20, nature: 'fixed' } },
        ],
      }],
    }];

    const result = formatThirdPartyPayerBills(thirdPartyPayerBills, customer, number);
    expect(result).toBeDefined();
    expect(result.tppBills).toBeDefined();
    expect(result.tppBills[0]).toMatchObject({
      customer: 'lilalo',
      billNumber: 'Picsou077',
      client: 'Papa',
      subscriptions: [{
        subscription: 'asd',
        unitExclTaxes: 24.644549763033176,
        exclTaxes: 13.649289099526067,
        inclTaxes: 14.4,
        hours: 1.5,
        events: ['123', '456'],
        vat: 12,
      }],
    });
    expect(result.billedEvents).toBeDefined();
    expect(result.billedEvents).toMatchObject({
      123: { event: '123', inclTaxesTpp: 14.4 },
      456: { event: '456', inclTaxesTpp: 12 },
    });
    expect(result.fundingHistories).toBeDefined();
    expect(result.fundingHistories).toMatchObject({
      fund: { amountTTC: 60, fundingVersion: 'fund', nature: 'fixed' },
    });
  });

  it('Case 4 : 1 third party payer - multiple bills', () => {
    const customer = { _id: 'lilalo' };
    const number = { prefix: 'Picsou', seq: 77 };
    const thirdPartyPayerBills = [{
      total: 14.4,
      bills: [{
        thirdPartyPayer: 'Papa',
        subscription: { _id: 'asd', service: { versions: [{ vat: 12, startDate: moment().toISOString(), }] } },
        unitExclTaxes: 24.644549763033176,
        exclTaxes: 13.649289099526067,
        startDate: moment().add(1, 'd').toISOString(),
        inclTaxes: 14.4,
        hours: 1.5,
        eventsList: [
          { event: '123', inclTaxesTpp: 14.4, history: { fundingVersion: 'fund', careHours: 2, month: '02/2019', nature: 'hourly' } },
          { event: '456', inclTaxesTpp: 12, history: { fundingVersion: 'lio', careHours: 4, month: '02/2019', nature: 'hourly' } },
        ],
      }, {
        thirdPartyPayer: 'Papa',
        subscription: { _id: 'fgh', service: { versions: [{ vat: 5.5, startDate: moment().toISOString(), }] } },
        unitExclTaxes: 34,
        exclTaxes: 15,
        startDate: moment().add(1, 'd').toISOString(),
        inclTaxes: 11,
        hours: 5,
        eventsList: [
          { event: '890', inclTaxesTpp: 45, history: { fundingVersion: 'fund', careHours: 4.5, month: '02/2019', nature: 'hourly' } },
          { event: '736', inclTaxesTpp: 23, history: { fundingVersion: 'fund', careHours: 1, month: '03/2019', nature: 'hourly' } },
        ],
      }],
    }];

    const result = formatThirdPartyPayerBills(thirdPartyPayerBills, customer, number);
    expect(result).toBeDefined();
    expect(result.tppBills).toBeDefined();
    expect(result.tppBills[0]).toMatchObject({
      customer: 'lilalo',
      billNumber: 'Picsou077',
      client: 'Papa',
      subscriptions: [{
        subscription: 'asd',
        unitExclTaxes: 24.644549763033176,
        exclTaxes: 13.649289099526067,
        inclTaxes: 14.4,
        hours: 1.5,
        events: ['123', '456'],
        vat: 12,
      }, {
        subscription: 'fgh',
        unitExclTaxes: 34,
        exclTaxes: 15,
        inclTaxes: 11,
        hours: 5,
        events: ['890', '736'],
        vat: 5.5,
      }],
    });
    expect(result.billedEvents).toBeDefined();
    expect(result.billedEvents).toMatchObject({
      123: { event: '123', inclTaxesTpp: 14.4 },
      456: { event: '456', inclTaxesTpp: 12 },
      890: { event: '890', inclTaxesTpp: 45 },
      736: { event: '736', inclTaxesTpp: 23 },
    });
    expect(result.fundingHistories).toBeDefined();
    expect(result.fundingHistories).toMatchObject({
      fund: {
        '02/2019': { careHours: 6.5, fundingVersion: 'fund', month: '02/2019', nature: 'hourly' },
        '03/2019': { careHours: 1, fundingVersion: 'fund', month: '03/2019', nature: 'hourly' },
      },
      lio: { '02/2019': { careHours: 4, fundingVersion: 'lio', month: '02/2019', nature: 'hourly' } },
    });
  });

  it('Case 5 : multiple third party payers', () => {
    const customer = { _id: 'lilalo' };
    const number = { prefix: 'Picsou', seq: 77 };
    const thirdPartyPayerBills = [{
      total: 14.4,
      bills: [{
        thirdPartyPayer: 'Papa',
        subscription: { _id: 'asd', service: { versions: [{ vat: 12, startDate: moment().toISOString(), }] } },
        unitExclTaxes: 24.644549763033176,
        exclTaxes: 13.649289099526067,
        startDate: moment().add(1, 'd').toISOString(),
        inclTaxes: 14.4,
        hours: 1.5,
        eventsList: [
          { event: '123', inclTaxesTpp: 14.4, history: { fundingVersion: 'fund', careHours: 2 } },
          { event: '456', inclTaxesTpp: 12, history: { fundingVersion: 'lio', careHours: 4 } },
        ],
      }]
    }, {
      total: 14.4,
      bills: [{
        thirdPartyPayer: 'Papa',
        subscription: { _id: 'fgh', service: { versions: [{ vat: 12, startDate: moment().toISOString(), }] } },
        unitExclTaxes: 34,
        startDate: moment().add(1, 'd').toISOString(),
        exclTaxes: 15,
        inclTaxes: 11,
        hours: 5,
        eventsList: [
          { event: '890', inclTaxesTpp: 45, history: { fundingVersion: 'fund', careHours: 4.5 } },
          { event: '736', inclTaxesTpp: 23, history: { fundingVersion: 'fund', careHours: 1 } },
        ],
      }],
    }];

    const result = formatThirdPartyPayerBills(thirdPartyPayerBills, customer, number);
    expect(result).toBeDefined();
    expect(result.tppBills).toBeDefined();
    expect(result.tppBills.length).toEqual(2);
  });
});
