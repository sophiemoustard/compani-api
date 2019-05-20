const expect = require('expect');
const moment = require('moment');

const {
  formatBillNumber,
  formatCustomerBills,
  formatThirdPartyPayerBills,
  formatPDF,
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
          { event: '123', inclTaxesTpp: 14.4, history: { fundingId: 'fund', careHours: 4, month: '02/2019', nature: 'hourly' } },
          { event: '456', inclTaxesTpp: 12, history: { fundingId: 'fund', careHours: 2, month: '03/2019', nature: 'hourly' } },
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
        '02/2019': { careHours: 4, fundingId: 'fund', month: '02/2019', nature: 'hourly' },
        '03/2019': { careHours: 2, fundingId: 'fund', month: '03/2019', nature: 'hourly' },
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
          { event: '123', inclTaxesTpp: 14.4, history: { fundingId: 'fund', careHours: 4, nature: 'hourly' } },
          { event: '456', inclTaxesTpp: 12, history: { fundingId: 'fund', careHours: 2, nature: 'hourly' } },
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
      fund: { careHours: 6, fundingId: 'fund', nature: 'hourly' },
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
          { event: '123', inclTaxesTpp: 14.4, history: { fundingId: 'fund', amountTTC: 40, nature: 'fixed' } },
          { event: '456', inclTaxesTpp: 12, history: { fundingId: 'fund', amountTTC: 20, nature: 'fixed' } },
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
      fund: { amountTTC: 60, fundingId: 'fund', nature: 'fixed' },
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
          { event: '123', inclTaxesTpp: 14.4, history: { fundingId: 'fund', careHours: 2, month: '02/2019', nature: 'hourly' } },
          { event: '456', inclTaxesTpp: 12, history: { fundingId: 'lio', careHours: 4, month: '02/2019', nature: 'hourly' } },
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
          { event: '890', inclTaxesTpp: 45, history: { fundingId: 'fund', careHours: 4.5, month: '02/2019', nature: 'hourly' } },
          { event: '736', inclTaxesTpp: 23, history: { fundingId: 'fund', careHours: 1, month: '03/2019', nature: 'hourly' } },
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
        '02/2019': { careHours: 6.5, fundingId: 'fund', month: '02/2019', nature: 'hourly' },
        '03/2019': { careHours: 1, fundingId: 'fund', month: '03/2019', nature: 'hourly' },
      },
      lio: { '02/2019': { careHours: 4, fundingId: 'lio', month: '02/2019', nature: 'hourly' } },
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
          { event: '123', inclTaxesTpp: 14.4, history: { fundingId: 'fund', careHours: 2 } },
          { event: '456', inclTaxesTpp: 12, history: { fundingId: 'lio', careHours: 4 } },
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
          { event: '890', inclTaxesTpp: 45, history: { fundingId: 'fund', careHours: 4.5 } },
          { event: '736', inclTaxesTpp: 23, history: { fundingId: 'fund', careHours: 1 } },
        ],
      }],
    }];

    const result = formatThirdPartyPayerBills(thirdPartyPayerBills, customer, number);
    expect(result).toBeDefined();
    expect(result.tppBills).toBeDefined();
    expect(result.tppBills.length).toEqual(2);
  });
});

describe('formatPDF', () => {
  it('should format correct bill PDF', () => {
    const bill = {
      subscriptions: [{
        events: [{
          auxiliary: {
            identity: {
              firstname: 'Nathanaelle',
            }
          },
          startDate: '2019-04-10T06:00:00.000Z',
          endDate: '2019-04-10T08:00:00.000Z',
          bills: {
            inclTaxesCustomer: 52,
            exclTaxesCustomer: 49.28909952606635
          }
        }],
        startDate: '2019-03-31T22:00:00.000Z',
        endDate: '2019-04-30T21:59:59.999Z',
        unitExclTaxes: 24.644549763033176,
        vat: 5.5,
        hours: 40,
        exclTaxes: 1018.0094786729859,
        inclTaxes: 1074,
        service: 'Temps de qualité - autonomie'
      }],
      netInclTaxes: 1074,
      date: '2019-04-30T21:59:59.999Z',
    };
    const company = {};
    const result = {
      bill: {
        subscriptions: [{
          events: [{
            auxiliary: { identity: { firstname: 'N' } },
            startDate: '2019-04-10T06:00:00.000Z',
            endDate: '2019-04-10T08:00:00.000Z',
            bills: {
              inclTaxesCustomer: 52,
              exclTaxesCustomer: 49.28909952606635
            },
            date: moment('2019-04-10T06:00:00.000Z').format('DD/MM'),
            startTime: moment('2019-04-10T06:00:00.000Z').format('HH:mm'),
            endTime: moment('2019-04-10T08:00:00.000Z').format('HH:mm'),
            service: 'Temps de qualité - autonomie'
          }],
          startDate: '2019-03-31T22:00:00.000Z',
          endDate: '2019-04-30T21:59:59.999Z',
          unitExclTaxes: 24.644549763033176,
          vat: '5,5',
          hours: 40,
          exclTaxes: '1 018,01 €',
          inclTaxes: '1 074,00 €',
          service: 'Temps de qualité - autonomie'
        }],
        netInclTaxes: '1 074,00 €',
        date: moment('2019-04-30T21:59:59.999Z').format('DD/MM/YYYY'),
        totalExclTaxes: '1 018,01 €',
        totalVAT: '55,99 €',
        formattedSubs: [{
          events: [{
            auxiliary: { identity: { firstname: 'N' } },
            startDate: '2019-04-10T06:00:00.000Z',
            endDate: '2019-04-10T08:00:00.000Z',
            bills: {
              inclTaxesCustomer: 52,
              exclTaxesCustomer: 49.28909952606635
            },
            date: moment('2019-04-10T06:00:00.000Z').format('DD/MM'),
            startTime: moment('2019-04-10T06:00:00.000Z').format('HH:mm'),
            endTime: moment('2019-04-10T08:00:00.000Z').format('HH:mm'),
            service: 'Temps de qualité - autonomie'
          }],
          startDate: '2019-03-31T22:00:00.000Z',
          endDate: '2019-04-30T21:59:59.999Z',
          unitExclTaxes: 24.644549763033176,
          vat: '5,5',
          hours: 40,
          exclTaxes: '1 018,01 €',
          inclTaxes: '1 074,00 €',
          service: 'Temps de qualité - autonomie'
        }],
        formattedEvents: [{
          auxiliary: { identity: { firstname: 'N' } },
          startDate: '2019-04-10T06:00:00.000Z',
          endDate: '2019-04-10T08:00:00.000Z',
          bills: {
            inclTaxesCustomer: 52,
            exclTaxesCustomer: 49.28909952606635
          },
          date: moment('2019-04-10T06:00:00.000Z').format('DD/MM'),
          startTime: moment('2019-04-10T06:00:00.000Z').format('HH:mm'),
          endTime: moment('2019-04-10T08:00:00.000Z').format('HH:mm'),
          service: 'Temps de qualité - autonomie'
        }],
        company: {},
        logo: 'https://res.cloudinary.com/alenvi/image/upload/v1507019444/images/business/alenvi_logo_complet_183x50.png'
      }
    };
    expect(formatPDF(bill, company)).toEqual(expect.objectContaining(result));
  });
});
