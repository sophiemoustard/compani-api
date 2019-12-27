const expect = require('expect');
const moment = require('moment');
const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const pick = require('lodash/pick');
const omit = require('lodash/omit');

const FundingHistory = require('../../../src/models/FundingHistory');
const BillNumber = require('../../../src/models/BillNumber');
const Event = require('../../../src/models/Event');
const Bill = require('../../../src/models/Bill');
const BillHelper = require('../../../src/helpers/bills');
const UtilsHelper = require('../../../src/helpers/utils');
const PdfHelper = require('../../../src/helpers/pdf');
const {
  bills: billsData,
  customerId: customerIdData,
  companyId: companyIdData,
} = require('../data/bills');

require('sinon-mongoose');

describe('formatBillNumber', () => {
  it('should return the correct bill number', () => {
    expect(BillHelper.formatBillNumber(105, 'toto', 5)).toEqual('FACT-105toto00005');
    expect(BillHelper.formatBillNumber(105, 'toto', 12345)).toEqual('FACT-105toto12345');
  });
});

describe('formatSubscriptionData', () => {
  it('should return formatted subscription data', () => {
    const bill = {
      subscription: {
        _id: 'asd',
        service: {
          _id: '1234567890',
          nature: 'test',
          versions: [{ name: 'service', vat: 12, startDate: moment().toISOString() }],
        },
      },
      unitExclTaxes: 24.644549763033176,
      exclTaxes: 13.649289099526067,
      inclTaxes: 14.4,
      startDate: '2019-06-28T10:06:55.374Z',
      hours: 1.5,
      eventsList: [
        {
          event: '123',
          startDate: '2019-05-28T10:00:55.374Z',
          endDate: '2019-05-28T13:00:55.374Z',
          auxiliary: '34567890',
        },
        {
          event: '456',
          startDate: '2019-05-29T08:00:55.374Z',
          endDate: '2019-05-29T10:00:55.374Z',
          auxiliary: '34567890',
        },
      ],
    };
    const getMatchingVersionStub = sinon.stub(UtilsHelper, 'getMatchingVersion');
    getMatchingVersionStub.returns({
      _id: '1234567890',
      nature: 'test',
      name: 'service',
      vat: 12,
      startDate: '2019-06-27T10:06:55.374Z',
    });

    const result = BillHelper.formatSubscriptionData(bill);
    expect(result).toEqual(expect.objectContaining({
      subscription: 'asd',
      service: { serviceId: '1234567890', nature: 'test', name: 'service' },
      unitExclTaxes: 24.644549763033176,
      exclTaxes: 13.649289099526067,
      inclTaxes: 14.4,
      vat: 12,
      startDate: '2019-06-28T10:06:55.374Z',
      hours: 1.5,
      events: [
        {
          eventId: '123',
          startDate: '2019-05-28T10:00:55.374Z',
          endDate: '2019-05-28T13:00:55.374Z',
          auxiliary: '34567890',
        },
        {
          eventId: '456',
          startDate: '2019-05-29T08:00:55.374Z',
          endDate: '2019-05-29T10:00:55.374Z',
          auxiliary: '34567890',
        },
      ],
    }));
    sinon.assert.calledWithExactly(getMatchingVersionStub, bill.endDate, bill.subscription.service, 'startDate');
    getMatchingVersionStub.restore();
  });
});

describe('formatCustomerBills', () => {
  it('Case 1 : 1 bill', () => {
    const company = { prefixNumber: 1234, _id: new ObjectID() };
    const customer = { _id: 'lilalo' };
    const number = { prefix: 'Picsou', seq: 77 };
    const customerBills = {
      shouldBeSent: true,
      bills: [{
        subscription: { _id: 'asd', service: { versions: [{ vat: 12, startDate: moment().toISOString() }] } },
        unitExclTaxes: 24.644549763033176,
        exclTaxes: 13.649289099526067,
        inclTaxes: 14.4,
        startDate: moment().add(1, 'd').toISOString(),
        hours: 1.5,
        eventsList: [
          {
            event: '123',
            startDate: '2019-05-28T10:00:55.374Z',
            endDate: '2019-05-28T13:00:55.374Z',
            auxiliary: '34567890',
            inclTaxesTpp: 14.4,
          },
          {
            event: '456',
            startDate: '2019-05-29T08:00:55.374Z',
            endDate: '2019-05-29T10:00:55.374Z',
            auxiliary: '34567890',
            inclTaxesTpp: 12,
          },
        ],
      }],
      total: 14.4,
    };

    const result = BillHelper.formatCustomerBills(customerBills, customer, number, company);
    expect(result).toBeDefined();
    expect(result.bill).toBeDefined();
    expect(result.bill).toMatchObject({
      company: company._id,
      customer: 'lilalo',
      number: 'FACT-1234Picsou00077',
      shouldBeSent: true,
      subscriptions: [{
        subscription: 'asd',
        unitExclTaxes: 24.644549763033176,
        exclTaxes: 13.649289099526067,
        inclTaxes: 14.4,
        hours: 1.5,
        events: [
          {
            eventId: '123',
            startDate: '2019-05-28T10:00:55.374Z',
            endDate: '2019-05-28T13:00:55.374Z',
            auxiliary: '34567890',
          },
          {
            eventId: '456',
            startDate: '2019-05-29T08:00:55.374Z',
            endDate: '2019-05-29T10:00:55.374Z',
            auxiliary: '34567890',
          },
        ],
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
    const company = { prefixNumber: 1234, _id: new ObjectID() };
    const customer = { _id: 'lilalo' };
    const number = { prefix: 'Picsou', seq: 77 };
    const customerBills = {
      total: 14.4,
      shouldBeSent: false,
      bills: [{
        subscription: { _id: 'asd', service: { versions: [{ vat: 12, startDate: moment().toISOString() }] } },
        unitExclTaxes: 24.644549763033176,
        exclTaxes: 13.649289099526067,
        inclTaxes: 14.4,
        hours: 1.5,
        startDate: moment().add(1, 'd').toISOString(),
        eventsList: [
          {
            event: '123',
            startDate: '2019-05-28T10:00:55.374Z',
            endDate: '2019-05-28T13:00:55.374Z',
            auxiliary: '34567890',
            inclTaxesTpp: 14.4,
          },
          {
            event: '456',
            startDate: '2019-05-29T08:00:55.374Z',
            endDate: '2019-05-29T10:00:55.374Z',
            auxiliary: '34567890',
            inclTaxesTpp: 12,
          },
        ],
      }, {
        subscription: { _id: 'fgh', service: { versions: [{ vat: 34, startDate: moment().toISOString() }] } },
        unitExclTaxes: 34,
        exclTaxes: 15,
        inclTaxes: 11,
        hours: 5,
        startDate: moment().add(1, 'd').toISOString(),
        eventsList: [
          {
            event: '890',
            startDate: '2019-05-29T10:00:55.374Z',
            endDate: '2019-05-29T13:00:55.374Z',
            auxiliary: '34567890',
            inclTaxesTpp: 45,
          },
          {
            event: '736',
            startDate: '2019-05-30T08:00:55.374Z',
            endDate: '2019-05-30T10:00:55.374Z',
            auxiliary: '34567890',
            inclTaxesTpp: 23,
          },
        ],
      }],
    };

    const result = BillHelper.formatCustomerBills(customerBills, customer, number, company);
    expect(result).toBeDefined();
    expect(result.bill).toBeDefined();
    expect(result.bill).toMatchObject({
      company: company._id,
      customer: 'lilalo',
      number: 'FACT-1234Picsou00077',
      shouldBeSent: false,
      subscriptions: [{
        subscription: 'asd',
        unitExclTaxes: 24.644549763033176,
        exclTaxes: 13.649289099526067,
        inclTaxes: 14.4,
        hours: 1.5,
        events: [
          {
            eventId: '123',
            startDate: '2019-05-28T10:00:55.374Z',
            endDate: '2019-05-28T13:00:55.374Z',
            auxiliary: '34567890',
          },
          {
            eventId: '456',
            startDate: '2019-05-29T08:00:55.374Z',
            endDate: '2019-05-29T10:00:55.374Z',
            auxiliary: '34567890',
          },
        ],
        vat: 12,
      }, {
        subscription: 'fgh',
        unitExclTaxes: 34,
        exclTaxes: 15,
        inclTaxes: 11,
        hours: 5,
        events: [
          {
            eventId: '890',
            startDate: '2019-05-29T10:00:55.374Z',
            endDate: '2019-05-29T13:00:55.374Z',
            auxiliary: '34567890',
          },
          {
            eventId: '736',
            startDate: '2019-05-30T08:00:55.374Z',
            endDate: '2019-05-30T10:00:55.374Z',
            auxiliary: '34567890',
          },
        ],
        vat: 34,
      }],
    });
    expect(result.billedEvents).toBeDefined();
    expect(result.billedEvents).toMatchObject({
      123: { event: '123', inclTaxesTpp: 14.4 },
      456: { event: '456', inclTaxesTpp: 12 },
      890: { event: '890', inclTaxesTpp: 45 },
      736: { event: '736', inclTaxesTpp: 23 },
    });
  });
});

describe('formatThirdPartyPayerBills', () => {
  it('Case 1 : 1 third party payer - 1 bill - Funding monthly and hourly', () => {
    const company = { prefixNumber: 1234, _id: new ObjectID() };
    const customer = { _id: 'lilalo' };
    const number = { prefix: 'Picsou', seq: 77 };
    const thirdPartyPayerBills = [{
      total: 14.4,
      bills: [{
        thirdPartyPayer: 'Papa',
        subscription: { _id: 'asd', service: { versions: [{ vat: 12, startDate: moment().toISOString() }] } },
        unitExclTaxes: 24.644549763033176,
        startDate: moment().add(1, 'd').toISOString(),
        exclTaxes: 13.649289099526067,
        inclTaxes: 14.4,
        hours: 1.5,
        eventsList: [
          {
            event: '123',
            inclTaxesTpp: 14.4,
            startDate: '2019-02-15T08:00:55.374Z',
            endDate: '2019-02-15T10:00:55.374Z',
            auxiliary: '34567890',
            history: { fundingId: 'fund', careHours: 4, month: '02/2019', nature: 'hourly' },
          },
          {
            event: '456',
            inclTaxesTpp: 12,
            startDate: '2019-02-16T08:00:55.374Z',
            endDate: '2019-02-16T10:00:55.374Z',
            auxiliary: '34567890',
            history: { fundingId: 'fund', careHours: 2, month: '03/2019', nature: 'hourly' },
          },
        ],
      }],
    }];

    const result = BillHelper.formatThirdPartyPayerBills(thirdPartyPayerBills, customer, number, company);
    expect(result).toBeDefined();
    expect(result.tppBills).toBeDefined();
    expect(result.tppBills[0]).toMatchObject({
      company: company._id,
      customer: 'lilalo',
      number: 'FACT-1234Picsou00077',
      client: 'Papa',
      subscriptions: [{
        subscription: 'asd',
        unitExclTaxes: 24.644549763033176,
        exclTaxes: 13.649289099526067,
        inclTaxes: 14.4,
        hours: 1.5,
        events: [
          {
            eventId: '123',
            auxiliary: '34567890',
            startDate: '2019-02-15T08:00:55.374Z',
            endDate: '2019-02-15T10:00:55.374Z',
          },
          {
            eventId: '456',
            auxiliary: '34567890',
            startDate: '2019-02-16T08:00:55.374Z',
            endDate: '2019-02-16T10:00:55.374Z',
          },
        ],
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
      },
    });
  });
  it('Case 2 : 1 third party payer - 1 bill - Funding once and hourly', () => {
    const company = { prefixNumber: 1234, _id: new ObjectID() };
    const customer = { _id: 'lilalo' };
    const number = { prefix: 'Picsou', seq: 77 };
    const thirdPartyPayerBills = [{
      total: 14.4,
      bills: [{
        thirdPartyPayer: 'Papa',
        subscription: { _id: 'asd', service: { versions: [{ vat: 12, startDate: moment().toISOString() }] } },
        unitExclTaxes: 24.644549763033176,
        startDate: moment().add(1, 'd').toISOString(),
        exclTaxes: 13.649289099526067,
        inclTaxes: 14.4,
        hours: 1.5,
        eventsList: [
          {
            event: '123',
            inclTaxesTpp: 14.4,
            startDate: '2019-02-15T08:00:55.374Z',
            endDate: '2019-02-15T10:00:55.374Z',
            auxiliary: '34567890',
            history: { fundingId: 'fund', careHours: 4, nature: 'hourly' },
          },
          {
            event: '456',
            inclTaxesTpp: 12,
            startDate: '2019-02-16T08:00:55.374Z',
            endDate: '2019-02-16T10:00:55.374Z',
            auxiliary: '34567890',
            history: { fundingId: 'fund', careHours: 2, nature: 'hourly' },
          },
        ],
      }],
    }];

    const result = BillHelper.formatThirdPartyPayerBills(thirdPartyPayerBills, customer, number, company);
    expect(result).toBeDefined();
    expect(result.tppBills).toBeDefined();
    expect(result.tppBills[0]).toMatchObject({
      company: company._id,
      customer: 'lilalo',
      number: 'FACT-1234Picsou00077',
      client: 'Papa',
      subscriptions: [{
        subscription: 'asd',
        unitExclTaxes: 24.644549763033176,
        exclTaxes: 13.649289099526067,
        inclTaxes: 14.4,
        hours: 1.5,
        events: [
          {
            eventId: '123',
            auxiliary: '34567890',
            startDate: '2019-02-15T08:00:55.374Z',
            endDate: '2019-02-15T10:00:55.374Z',
          },
          {
            eventId: '456',
            auxiliary: '34567890',
            startDate: '2019-02-16T08:00:55.374Z',
            endDate: '2019-02-16T10:00:55.374Z',
          },
        ],
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
    const company = { prefixNumber: 1234, _id: new ObjectID() };
    const customer = { _id: 'lilalo' };
    const number = { prefix: 'Picsou', seq: 77 };
    const thirdPartyPayerBills = [{
      total: 14.4,
      bills: [{
        thirdPartyPayer: 'Papa',
        subscription: { _id: 'asd', service: { versions: [{ vat: 12, startDate: moment().toISOString() }] } },
        unitExclTaxes: 24.644549763033176,
        startDate: moment().add(1, 'd').toISOString(),
        exclTaxes: 13.649289099526067,
        inclTaxes: 14.4,
        hours: 1.5,
        eventsList: [
          {
            event: '123',
            inclTaxesTpp: 14.4,
            auxiliary: '34567890',
            startDate: '2019-02-15T08:00:55.374Z',
            endDate: '2019-02-15T10:00:55.374Z',
            history: { fundingId: 'fund', amountTTC: 40, nature: 'fixed' },
          },
          {
            event: '456',
            inclTaxesTpp: 12,
            auxiliary: '34567890',
            startDate: '2019-02-16T08:00:55.374Z',
            endDate: '2019-02-16T10:00:55.374Z',
            history: { fundingId: 'fund', amountTTC: 20, nature: 'fixed' },
          },
        ],
      }],
    }];

    const result = BillHelper.formatThirdPartyPayerBills(thirdPartyPayerBills, customer, number, company);
    expect(result).toBeDefined();
    expect(result.tppBills).toBeDefined();
    expect(result.tppBills[0]).toMatchObject({
      company: company._id,
      customer: 'lilalo',
      number: 'FACT-1234Picsou00077',
      client: 'Papa',
      subscriptions: [{
        subscription: 'asd',
        unitExclTaxes: 24.644549763033176,
        exclTaxes: 13.649289099526067,
        inclTaxes: 14.4,
        hours: 1.5,
        events: [
          {
            eventId: '123',
            auxiliary: '34567890',
            startDate: '2019-02-15T08:00:55.374Z',
            endDate: '2019-02-15T10:00:55.374Z',
          },
          {
            eventId: '456',
            auxiliary: '34567890',
            startDate: '2019-02-16T08:00:55.374Z',
            endDate: '2019-02-16T10:00:55.374Z',
          },
        ],
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
    const company = { _id: new ObjectID(), prefixNumber: 1234 };
    const customer = { _id: 'lilalo' };
    const number = { prefix: 'Picsou', seq: 77 };
    const thirdPartyPayerBills = [{
      total: 14.4,
      bills: [{
        thirdPartyPayer: 'Papa',
        subscription: { _id: 'asd', service: { versions: [{ vat: 12, startDate: moment().toISOString() }] } },
        unitExclTaxes: 24.644549763033176,
        exclTaxes: 13.649289099526067,
        startDate: moment().add(1, 'd').toISOString(),
        inclTaxes: 14.4,
        hours: 1.5,
        eventsList: [
          {
            event: '123',
            auxiliary: '34567890',
            startDate: '2019-02-15T08:00:55.374Z',
            endDate: '2019-02-15T10:00:55.374Z',
            inclTaxesTpp: 14.4,
            history: { fundingId: 'fund', careHours: 2, month: '02/2019', nature: 'hourly' },
          },
          {
            event: '456',
            auxiliary: '34567890',
            startDate: '2019-02-16T08:00:55.374Z',
            endDate: '2019-02-16T10:00:55.374Z',
            inclTaxesTpp: 12,
            history: { fundingId: 'lio', careHours: 4, month: '02/2019', nature: 'hourly' },
          },
        ],
      }, {
        thirdPartyPayer: 'Papa',
        subscription: { _id: 'fgh', service: { versions: [{ vat: 5.5, startDate: moment().toISOString() }] } },
        unitExclTaxes: 34,
        exclTaxes: 15,
        startDate: moment().add(1, 'd').toISOString(),
        inclTaxes: 11,
        hours: 5,
        eventsList: [
          {
            event: '890',
            auxiliary: '34567890',
            startDate: '2019-02-17T08:00:55.374Z',
            endDate: '2019-02-17T10:00:55.374Z',
            inclTaxesTpp: 45,
            history: { fundingId: 'fund', careHours: 4.5, month: '02/2019', nature: 'hourly' },
          },
          {
            event: '736',
            auxiliary: '34567890',
            startDate: '2019-02-18T08:00:55.374Z',
            endDate: '2019-02-18T10:00:55.374Z',
            inclTaxesTpp: 23,
            history: { fundingId: 'fund', careHours: 1, month: '03/2019', nature: 'hourly' },
          },
        ],
      }],
    }];

    const result = BillHelper.formatThirdPartyPayerBills(thirdPartyPayerBills, customer, number, company);
    expect(result).toBeDefined();
    expect(result.tppBills).toBeDefined();
    expect(result.tppBills[0]).toMatchObject({
      company: company._id,
      customer: 'lilalo',
      number: 'FACT-1234Picsou00077',
      client: 'Papa',
      subscriptions: [{
        subscription: 'asd',
        unitExclTaxes: 24.644549763033176,
        exclTaxes: 13.649289099526067,
        inclTaxes: 14.4,
        hours: 1.5,
        events: [
          {
            eventId: '123',
            auxiliary: '34567890',
            startDate: '2019-02-15T08:00:55.374Z',
            endDate: '2019-02-15T10:00:55.374Z',
          },
          {
            eventId: '456',
            auxiliary: '34567890',
            startDate: '2019-02-16T08:00:55.374Z',
            endDate: '2019-02-16T10:00:55.374Z',
          },
        ],
        vat: 12,
      }, {
        subscription: 'fgh',
        unitExclTaxes: 34,
        exclTaxes: 15,
        inclTaxes: 11,
        hours: 5,
        events: [
          {
            eventId: '890',
            auxiliary: '34567890',
            startDate: '2019-02-17T08:00:55.374Z',
            endDate: '2019-02-17T10:00:55.374Z',
          },
          {
            eventId: '736',
            auxiliary: '34567890',
            startDate: '2019-02-18T08:00:55.374Z',
            endDate: '2019-02-18T10:00:55.374Z',
          },
        ],
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
    const companyId = new ObjectID();
    const customer = { _id: 'lilalo' };
    const number = { prefix: 'Picsou', seq: 77 };
    const thirdPartyPayerBills = [{
      total: 14.4,
      bills: [{
        thirdPartyPayer: 'Papa',
        subscription: { _id: 'asd', service: { versions: [{ vat: 12, startDate: moment().toISOString() }] } },
        unitExclTaxes: 24.644549763033176,
        exclTaxes: 13.649289099526067,
        startDate: moment().add(1, 'd').toISOString(),
        inclTaxes: 14.4,
        hours: 1.5,
        eventsList: [
          { event: '123', inclTaxesTpp: 14.4, history: { fundingId: 'fund', careHours: 2 } },
          { event: '456', inclTaxesTpp: 12, history: { fundingId: 'lio', careHours: 4 } },
        ],
      }],
    }, {
      total: 14.4,
      bills: [{
        thirdPartyPayer: 'Papa',
        subscription: { _id: 'fgh', service: { versions: [{ vat: 12, startDate: moment().toISOString() }] } },
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

    const result = BillHelper.formatThirdPartyPayerBills(thirdPartyPayerBills, customer, number, companyId);
    expect(result).toBeDefined();
    expect(result.tppBills).toBeDefined();
    expect(result.tppBills.length).toEqual(2);
  });
});

describe('updateEvents', () => {
  let updateOne;
  beforeEach(() => {
    updateOne = sinon.stub(Event, 'updateOne');
  });
  afterEach(() => {
    updateOne.restore();
  });

  it('should not update event as list is empty', async () => {
    await BillHelper.updateEvents([]);
    sinon.assert.notCalled(updateOne);
  });
  it('should update one event', async () => {
    const eventId = (new ObjectID()).toHexString();
    await BillHelper.updateEvents({ [eventId]: { _id: '_id' } });

    sinon.assert.calledOnce(updateOne);
    sinon.assert.calledWithExactly(updateOne, { _id: eventId }, { $set: { isBilled: true, bills: { _id: '_id' } } });
  });
  it('should update event list', async () => {
    await BillHelper.updateEvents({ 1: { _id: '1' }, 2: { _id: '2' }, 3: { _id: '3' } });

    sinon.assert.callCount(updateOne, 3);
    sinon.assert.calledWithExactly(
      updateOne.getCall(0),
      { _id: '1' },
      { $set: { isBilled: true, bills: { _id: '1' } } }
    );
    sinon.assert.calledWithExactly(
      updateOne.getCall(1),
      { _id: '2' },
      { $set: { isBilled: true, bills: { _id: '2' } } }
    );
    sinon.assert.calledWithExactly(
      updateOne.getCall(2),
      { _id: '3' },
      { $set: { isBilled: true, bills: { _id: '3' } } }
    );
  });
});

describe('updateFundingHistories', () => {
  let updateOne;
  beforeEach(() => {
    updateOne = sinon.stub(FundingHistory, 'updateOne');
  });
  afterEach(() => {
    updateOne.restore();
  });

  it('should not update history as list is empty', async () => {
    const companyId = new ObjectID();
    await BillHelper.updateFundingHistories([], companyId);

    sinon.assert.notCalled(updateOne);
  });
  it('should update history of fixed funding', async () => {
    const companyId = new ObjectID();
    const fundingId = new ObjectID();
    const histories = { [fundingId.toHexString()]: { amountTTC: 12 } };

    await BillHelper.updateFundingHistories(histories, companyId);

    sinon.assert.calledOnce(updateOne);
    sinon.assert.calledWithExactly(
      updateOne,
      { fundingId: fundingId.toHexString(), company: companyId },
      { $inc: { amountTTC: 12 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  });
  it('should update history of hourly and once funding', async () => {
    const companyId = new ObjectID();
    const fundingId = new ObjectID();
    const histories = { [fundingId.toHexString()]: { careHours: 12 } };

    await BillHelper.updateFundingHistories(histories, companyId);

    sinon.assert.calledOnce(updateOne);
    sinon.assert.calledWithExactly(
      updateOne,
      { fundingId: fundingId.toHexString(), company: companyId },
      { $inc: { careHours: 12 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  });
  it('should update history of hourly and monthly funding', async () => {
    const companyId = new ObjectID();
    const fundingId = new ObjectID();
    const histories = { [fundingId]: { 11: { careHours: 12 }, 12: { careHours: 18 } } };

    await BillHelper.updateFundingHistories(histories, companyId);

    sinon.assert.calledTwice(updateOne);
    sinon.assert.calledWithExactly(
      updateOne.getCall(0),
      { fundingId: fundingId.toHexString(), company: companyId, month: '11' },
      { $inc: { careHours: 12 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    sinon.assert.calledWithExactly(
      updateOne.getCall(1),
      { fundingId: fundingId.toHexString(), company: companyId, month: '12' },
      { $inc: { careHours: 18 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  });
  it('should update list of histories', async () => {});
});

describe('getBillNumber', () => {
  let BillNumberMock;
  beforeEach(() => {
    BillNumberMock = sinon.mock(BillNumber);
  });
  afterEach(() => {
    BillNumberMock.restore();
  });

  it('should return a bill number', async () => {
    const companyId = new ObjectID();
    const bills = [{ endDate: new Date('2019-11-15') }];
    const prefix = '1119';
    const billNumber = { prefix, seq: 1 };

    BillNumberMock.expects('findOneAndUpdate')
      .withExactArgs(
        { prefix, company: companyId },
        {},
        { new: true, upsert: true, setDefaultsOnInsert: true }
      )
      .chain('lean')
      .returns(billNumber);

    const result = await BillHelper.getBillNumber(bills, { _id: companyId });

    BillNumberMock.verify();
    expect(result).toEqual(billNumber);
  });
});

describe('formatAndCreateBills', () => {
  let BillNumberMock;
  let BillMock;
  let getBillNumberStub;
  let formatCustomerBillsStub;
  let formatThirdPartyPayerBillsStub;
  let updateFundingHistoriesStub;
  let updateEventsStub;
  beforeEach(() => {
    BillNumberMock = sinon.mock(BillNumber);
    BillMock = sinon.mock(Bill);
    getBillNumberStub = sinon.stub(BillHelper, 'getBillNumber');
    formatCustomerBillsStub = sinon.stub(BillHelper, 'formatCustomerBills');
    formatThirdPartyPayerBillsStub = sinon.stub(BillHelper, 'formatThirdPartyPayerBills');
    updateFundingHistoriesStub = sinon.stub(BillHelper, 'updateFundingHistories');
    updateEventsStub = sinon.stub(BillHelper, 'updateEvents');
  });
  afterEach(() => {
    BillNumberMock.restore();
    BillMock.restore();
    getBillNumberStub.restore();
    formatCustomerBillsStub.restore();
    formatThirdPartyPayerBillsStub.restore();
    updateFundingHistoriesStub.restore();
    updateEventsStub.restore();
  });

  it('should create customer and third party payer bills', async () => {
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };
    const number = { prefix: 'FACT-1911', seq: 1 };
    const customerBill = billsData[0].customerBills.bills[0];
    const tppBill = billsData[0].thirdPartyPayerBills[0].bills[0];
    const customerServiceVersion = customerBill.subscription.service.versions[0];
    const tppServiceVersion = tppBill.subscription.service.versions[0];
    const customerSubscriptionEvents = customerBill.eventsList.map(ev => ({
      eventId: ev.event,
      ...pick(ev, ['auxiliary', 'startDate', 'endDate', 'surcharges']),
    }));
    const tppSubscriptionEvents = tppBill.eventsList.map(ev => ({
      eventId: ev.event,
      ...pick(ev, ['auxiliary', 'startDate', 'endDate', 'surcharges']),
    }));
    const customerBilledEvents = customerBill.eventsList
      .reduce((acc, curr) => ({ ...acc, [curr.event]: { ...curr } }), {});
    const tppBilledEvents = tppBill.eventsList
      .reduce((acc, curr) => ({ ...acc, [curr.event]: { ...curr, careHours: curr.history.careHours } }), {});
    const customerBillingInfo = {
      bill: {
        customer: customerIdData,
        number: 'FACT-1911001',
        netInclTaxes: billsData[0].customerBills.total.toFixed(2),
        date: customerBill.endDate,
        shouldBeSent: billsData[0].customerBills.shouldBeSent,
        companyId: companyIdData,
        subscriptions: [{
          ...customerBill,
          subscription: customerBill.subscription._id,
          service: {
            serviceId: customerBill.subscription.service._id,
            ...pick(customerServiceVersion, ['name', 'nature']),
          },
          vat: customerServiceVersion.vat,
          events: customerSubscriptionEvents,
        }],
      },
      customerBilledEvents,
    };
    const tppBillingInfo = {
      tppBills: [{
        customer: customerIdData,
        number: 'FACT-1911002',
        client: tppBill.thirdPartyPayer._id,
        netInclTaxes: billsData[0].thirdPartyPayerBills[0].total.toFixed(2),
        date: tppBill.endDate,
        company: companyIdData,
        subscriptions: [{
          ...tppBill,
          subscription: tppBill.subscription._id,
          service: {
            serviceId: tppBill.subscription.service._id,
            ...pick(tppServiceVersion, ['name', 'nature']),
          },
          vat: tppServiceVersion.vat,
          events: tppSubscriptionEvents,
        }],
      }],
      tppBilledEvents,
      fundingHistories: {},
    };

    getBillNumberStub.returns(number);
    formatCustomerBillsStub.returns(customerBillingInfo);
    formatThirdPartyPayerBillsStub.returns(tppBillingInfo);
    BillMock.expects('create').twice();
    BillNumberMock
      .expects('updateOne')
      .withExactArgs({ prefix: number.prefix }, { $set: { seq: 3 } })
      .once();

    await BillHelper.formatAndCreateBills(billsData, credentials);

    BillNumberMock.verify();
    BillMock.verify();
    sinon.assert.calledWithExactly(getBillNumberStub, billsData, { _id: companyId });
    sinon.assert.calledWithExactly(
      formatCustomerBillsStub,
      billsData[0].customerBills,
      billsData[0].customer,
      number,
      { _id: companyId }
    );
    sinon.assert.calledWithExactly(
      formatThirdPartyPayerBillsStub,
      billsData[0].thirdPartyPayerBills,
      billsData[0].customer,
      number,
      { _id: companyId }
    );
    sinon.assert.calledWithExactly(updateFundingHistoriesStub, {}, companyId);
    sinon.assert.calledWithExactly(
      updateEventsStub,
      { ...customerBillingInfo.billedEvents, ...tppBillingInfo.billedEvents }
    );
  });

  it('should create customer bill', async () => {
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };
    const number = { prefix: 'FACT-1911', seq: 1 };
    const customerBill = billsData[0].customerBills.bills[0];
    const customerServiceVersion = customerBill.subscription.service.versions[0];
    const customerSubscriptionEvents = customerBill.eventsList.map(ev => ({
      eventId: ev.event,
      ...pick(ev, ['auxiliary', 'startDate', 'endDate', 'surcharges']),
    }));
    const customerBilledEvents = customerBill.eventsList
      .reduce((acc, curr) => ({ ...acc, [curr.event]: { ...curr } }), {});
    const customerBillingInfo = {
      bill: {
        customer: customerIdData,
        number: 'FACT-1911001',
        netInclTaxes: billsData[0].customerBills.total.toFixed(2),
        date: customerBill.endDate,
        shouldBeSent: billsData[0].customerBills.shouldBeSent,
        companyId: companyIdData,
        subscriptions: [{
          ...customerBill,
          subscription: customerBill.subscription._id,
          service: {
            serviceId: customerBill.subscription.service._id,
            ...pick(customerServiceVersion, ['name', 'nature']),
          },
          vat: customerServiceVersion.vat,
          events: customerSubscriptionEvents,
        }],
      },
      customerBilledEvents,
    };

    getBillNumberStub.returns(number);
    formatCustomerBillsStub.returns(customerBillingInfo);
    BillMock.expects('create').once();
    BillNumberMock
      .expects('updateOne')
      .withExactArgs({ prefix: number.prefix }, { $set: { seq: 2 } })
      .once();

    await BillHelper.formatAndCreateBills([omit(billsData[0], 'thirdPartyPayerBills')], credentials);

    BillNumberMock.verify();
    BillMock.verify();
    sinon.assert.calledWithExactly(
      formatCustomerBillsStub,
      billsData[0].customerBills,
      billsData[0].customer,
      number,
      { _id: companyId }
    );
    sinon.assert.notCalled(formatThirdPartyPayerBillsStub);
    sinon.assert.calledWithExactly(updateFundingHistoriesStub, {}, companyId);
    sinon.assert.calledWithExactly(updateEventsStub, { ...customerBillingInfo.billedEvents });
  });

  it('should create third party payer bill', async () => {
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };
    const number = { prefix: 'FACT-1911', seq: 1 };
    const tppBill = billsData[0].thirdPartyPayerBills[0].bills[0];
    const tppServiceVersion = tppBill.subscription.service.versions[0];
    const tppSubscriptionEvents = tppBill.eventsList.map(ev => ({
      eventId: ev.event,
      ...pick(ev, ['auxiliary', 'startDate', 'endDate', 'surcharges']),
    }));
    const tppBilledEvents = tppBill.eventsList
      .reduce((acc, curr) => ({ ...acc, [curr.event]: { ...curr, careHours: curr.history.careHours } }), {});
    const tppBillingInfo = {
      tppBills: [{
        customer: customerIdData,
        number: 'FACT-1911002',
        client: tppBill.thirdPartyPayer._id,
        netInclTaxes: billsData[0].thirdPartyPayerBills[0].total.toFixed(2),
        date: tppBill.endDate,
        company: companyIdData,
        subscriptions: [{
          ...tppBill,
          subscription: tppBill.subscription._id,
          service: {
            serviceId: tppBill.subscription.service._id,
            ...pick(tppServiceVersion, ['name', 'nature']),
          },
          vat: tppServiceVersion.vat,
          events: tppSubscriptionEvents,
        }],
      }],
      tppBilledEvents,
      fundingHistories: {},
    };

    getBillNumberStub.returns(number);
    formatThirdPartyPayerBillsStub.returns(tppBillingInfo);
    BillMock.expects('create').once();
    BillNumberMock
      .expects('updateOne')
      .withExactArgs({ prefix: number.prefix }, { $set: { seq: 2 } })
      .once();

    await BillHelper.formatAndCreateBills([{ ...billsData[0], customerBills: {} }], credentials);

    BillNumberMock.verify();
    BillMock.verify();
    sinon.assert.notCalled(formatCustomerBillsStub);
    sinon.assert.calledWithExactly(
      formatThirdPartyPayerBillsStub,
      billsData[0].thirdPartyPayerBills,
      billsData[0].customer,
      number,
      { _id: companyId }
    );
    sinon.assert.calledWithExactly(updateFundingHistoriesStub, {}, companyId);
    sinon.assert.calledWithExactly(updateEventsStub, { ...tppBillingInfo.billedEvents });
  });
});

describe('getBills', () => {
  let BillMock;
  let getDateQueryStub;
  const credentials = { company: { _id: new ObjectID() } };
  const bills = [{ _id: new ObjectID() }, { _id: new ObjectID() }];

  beforeEach(() => {
    BillMock = sinon.mock(Bill);
    getDateQueryStub = sinon.stub(UtilsHelper, 'getDateQuery');
  });

  afterEach(() => {
    BillMock.restore();
    getDateQueryStub.restore();
  });

  it('should return bills', async () => {
    BillMock
      .expects('find')
      .withExactArgs({ company: credentials.company._id })
      .chain('populate')
      .withExactArgs({ path: 'client', select: '_id name' })
      .chain('lean')
      .returns(bills);

    const result = await BillHelper.getBills({}, credentials);

    expect(result).toEqual(bills);
    BillMock.verify();
    sinon.assert.notCalled(getDateQueryStub);
  });

  it('should return bills at specified start date', async () => {
    const query = { startDate: new Date('2019-11-01') };
    const dateQuery = { $lte: query.startDate };

    getDateQueryStub.returns(dateQuery);
    BillMock
      .expects('find')
      .withExactArgs({ company: credentials.company._id, date: dateQuery })
      .chain('populate')
      .withExactArgs({ path: 'client', select: '_id name' })
      .chain('lean')
      .returns(bills);

    const result = await BillHelper.getBills(query, credentials);

    expect(result).toEqual(bills);
    BillMock.verify();
    sinon.assert.calledWithExactly(getDateQueryStub, { ...query, endDate: undefined });
  });

  it('should return bills at specified end date', async () => {
    const query = { endDate: new Date('2019-11-01') };
    const dateQuery = { $gte: query.endDate };

    getDateQueryStub.returns(dateQuery);
    BillMock
      .expects('find')
      .withExactArgs({ company: credentials.company._id, date: dateQuery })
      .chain('populate')
      .withExactArgs({ path: 'client', select: '_id name' })
      .chain('lean')
      .returns(bills);

    const result = await BillHelper.getBills(query, credentials);

    expect(result).toEqual(bills);
    BillMock.verify();
    sinon.assert.calledWithExactly(getDateQueryStub, { ...query, startDate: undefined });
  });
});

describe('getUnitInclTaxes', () => {
  let getLastVersion;
  beforeEach(() => {
    getLastVersion = sinon.stub(UtilsHelper, 'getLastVersion');
  });
  afterEach(() => {
    getLastVersion.restore();
  });

  it('should return unitInclTaxes from subscription if no client', () => {
    const bill = {};
    const subscription = { unitInclTaxes: 20 };
    const result = BillHelper.getUnitInclTaxes(bill, subscription);

    expect(result).toBeDefined();
    expect(result).toBe(20);
    sinon.assert.notCalled(getLastVersion);
  });

  it('should return 0 if no matching funding found', () => {
    const bill = {
      client: { _id: new ObjectID() },
      customer: { fundings: [{ thirdPartyPayer: new ObjectID() }] },
    };
    const subscription = { unitInclTaxes: 20 };
    const result = BillHelper.getUnitInclTaxes(bill, subscription);

    expect(result).toBeDefined();
    expect(result).toBe(0);
    sinon.assert.notCalled(getLastVersion);
  });

  it('should return incl taxes amount for FIXED funding', () => {
    const tppId = new ObjectID();
    const bill = {
      client: { _id: tppId },
      customer: { fundings: [{ thirdPartyPayer: tppId, nature: 'fixed', versions: [{ amountTTC: 14.4 }] }] },
    };
    const subscription = { vat: 20 };

    getLastVersion.returns({ amountTTC: 14.4 });

    const result = BillHelper.getUnitInclTaxes(bill, subscription);

    expect(result).toBeDefined();
    expect(result).toBe(14.4);
    sinon.assert.called(getLastVersion);
  });

  it('should return unit incl taxes from funding if HOURLY fudning', () => {
    const tppId = new ObjectID();
    const bill = {
      client: { _id: tppId },
      customer: {
        fundings: [
          {
            thirdPartyPayer: tppId,
            nature: 'hourly',
            versions: [{ unitTTCRate: 18, customerParticipationRate: 20 }],
          },
        ],
      },
    };
    const subscription = { vat: 20 };

    getLastVersion.returns({ unitTTCRate: 18, customerParticipationRate: 20 });

    const result = BillHelper.getUnitInclTaxes(bill, subscription);

    expect(result).toBeDefined();
    expect(result).toBe(14.4);
    sinon.assert.called(getLastVersion);
  });
});

describe('formatBillSubscriptionsForPdf', () => {
  let getUnitInclTaxes;
  let formatPrice;
  beforeEach(() => {
    formatPrice = sinon.stub(UtilsHelper, 'formatPrice');
    getUnitInclTaxes = sinon.stub(BillHelper, 'getUnitInclTaxes');
  });
  afterEach(() => {
    getUnitInclTaxes.restore();
    formatPrice.restore();
    getUnitInclTaxes.restore();
  });

  it('should return formatted subscriptions', () => {
    getUnitInclTaxes.returns('24.63');
    formatPrice.onCall(0).returns('24,64 €');
    formatPrice.onCall(1).returns('1 074,00 €');
    formatPrice.onCall(2).returns('1 018,01 €');
    formatPrice.onCall(3).returns('55,99 €');

    const bill = {
      subscriptions: [{
        events: [{}],
        unitInclTaxes: 24.644549763033176,
        vat: 5.5,
        hours: 40,
        exclTaxes: 1018.009,
        inclTaxes: 1074,
        service: { name: 'Temps de qualité - autonomie' },
      }],
    };

    const result = {
      formattedSubs: [{
        vat: '5,5',
        hours: 40,
        inclTaxes: '1 074,00 €',
        service: 'Temps de qualité - autonomie',
        unitInclTaxes: '24,64 €',
      }],
      totalExclTaxes: '1 018,01 €',
      totalVAT: '55,99 €',
    };

    const formattedBillSubscriptions = BillHelper.formatBillSubscriptionsForPdf(bill);

    expect(formattedBillSubscriptions).toEqual(result);
  });
});

describe('formatEventsForPdf', () => {
  let formatEventSurchargesForPdf;
  beforeEach(() => {
    formatEventSurchargesForPdf = sinon.stub(PdfHelper, 'formatEventSurchargesForPdf');
  });
  afterEach(() => {
    formatEventSurchargesForPdf.restore();
  });

  it('should returns an empty array if no events provided', () => {
    const service = { name: 'Temps de qualité - autonomie' };
    const formattedEvents = BillHelper.formatEventsForPdf([], service);
    expect(formattedEvents).toEqual([]);
  });

  it('should returns formatted events', () => {
    const events = [{
      auxiliary: {
        identity: { firstname: 'Nathanaelle', lastname: 'Tata' },
      },
      startDate: '2019-04-10T06:00:00.000Z',
      endDate: '2019-04-10T08:00:00.000Z',
      bills: { inclTaxesCustomer: 52, exclTaxesCustomer: 49.28909952606635 },
      surcharges: [],
    }];
    const service = { name: 'Temps de qualité - autonomie' };

    const formattedEvents = BillHelper.formatEventsForPdf(events, service);

    expect(formattedEvents).toEqual([{
      date: '10/04',
      endTime: '10:00',
      identity: 'N. Tata',
      service: 'Temps de qualité - autonomie',
      startTime: '08:00',
    }]);
  });
});

describe('formatPDF', () => {
  let formatEventsForPdf;
  let formatBillSubscriptionsForPdf;
  beforeEach(() => {
    formatEventsForPdf = sinon.stub(BillHelper, 'formatEventsForPdf');
    formatBillSubscriptionsForPdf = sinon.stub(BillHelper, 'formatBillSubscriptionsForPdf');

    formatEventsForPdf.returns(['hello']);
  });
  afterEach(() => {
    formatEventsForPdf.restore();
    formatBillSubscriptionsForPdf.restore();
  });

  it('should format correct bill PDF for customer', () => {
    formatBillSubscriptionsForPdf.returns({
      formattedSubs: [{ vat: '5,5' }],
      totalExclTaxes: '1 018,01 €',
      totalVAT: '55,99 €',
    });

    const bill = {
      number: '12345',
      subscriptions: [{
        events: [{}],
        startDate: '2019-03-31T22:00:00.000Z',
        endDate: '2019-04-30T21:59:59.999Z',
        unitInclTaxes: 24.644549763033176,
        vat: 5.5,
        hours: 40,
        exclTaxes: 1018.009,
        inclTaxes: 1074,
        service: { name: 'Temps de qualité - autonomie' },
      }],
      customer: {
        identity: { title: 'mr', firstname: 'Donald', lastname: 'Duck' },
        contact: { primaryAddress: { fullAddress: 'La ruche' } },
      },
      netInclTaxes: 1074,
      date: '2019-04-30T21:59:59.999Z',
    };

    const expectedResult = {
      bill: {
        number: '12345',
        customer: {
          identity: { title: 'M.', firstname: 'Donald', lastname: 'Duck' },
          contact: { primaryAddress: { fullAddress: 'La ruche' } },
        },
        formattedSubs: [{
          vat: '5,5',
        }],
        recipient: {
          name: 'M. Donald Duck',
          address: { fullAddress: 'La ruche' },
        },
        netInclTaxes: '1 074,00 €',
        date: '30/04/2019',
        totalExclTaxes: '1 018,01 €',
        totalVAT: '55,99 €',
        formattedEvents: ['hello'],
        company: {},
        logo: 'https://res.cloudinary.com/alenvi/image/upload/v1507019444/images/business/alenvi_logo_complet_183x50.png',
        forTpp: false,
      },
    };

    const result = BillHelper.formatPDF(bill, {});

    expect(result).toEqual(expectedResult);
    sinon.assert.calledOnce(formatEventsForPdf);
    sinon.assert.calledWithExactly(
      formatEventsForPdf,
      bill.subscriptions[0].events,
      bill.subscriptions[0].service
    );
  });

  it('should format correct bill PDF for third party payer', () => {
    formatBillSubscriptionsForPdf.returns({
      formattedSubs: [{ vat: '5,5' }],
      totalExclTaxes: '1 018,01 €',
      totalVAT: '55,99 €',
    });

    const bill = {
      number: '12345',
      subscriptions: [{
        events: [{
          auxiliary: {
            identity: { firstname: 'Nathanaelle', lastname: 'Tata' },
          },
          startDate: '2019-04-10T06:00:00.000Z',
          endDate: '2019-04-10T08:00:00.000Z',
          bills: { inclTaxesCustomer: 52, exclTaxesCustomer: 49 },
        }],
        startDate: '2019-03-31T22:00:00.000Z',
        endDate: '2019-04-30T21:59:59.999Z',
        unitExclTaxes: 24.644549763033176,
        vat: 5.5,
        hours: 40,
        exclTaxes: 1018.009,
        inclTaxes: 1074,
        service: { name: 'Temps de qualité - autonomie' },
      }],
      customer: {
        identity: { title: 'mr', firstname: 'Donald', lastname: 'Duck' },
        contact: { primaryAddress: { fullAddress: 'La ruche' } },
      },
      client: {
        name: 'tpp',
        address: { fullAddress: 'j\'habite ici' },
      },
      netInclTaxes: 1074,
      date: '2019-04-30T21:59:59.999Z',
      forTpp: true,
    };

    const expected = {
      bill: {
        number: '12345',
        customer: {
          identity: { title: 'M.', firstname: 'Donald', lastname: 'Duck' },
          contact: { primaryAddress: { fullAddress: 'La ruche' } },
        },
        formattedSubs: [{
          vat: '5,5',
        }],
        recipient: {
          name: 'tpp',
          address: { fullAddress: 'j\'habite ici' },
        },
        netInclTaxes: '1 074,00 €',
        date: '30/04/2019',
        totalExclTaxes: '1 018,01 €',
        totalVAT: '55,99 €',
        formattedEvents: ['hello'],
        company: {},
        logo: 'https://res.cloudinary.com/alenvi/image/upload/v1507019444/images/business/alenvi_logo_complet_183x50.png',
        forTpp: true,
      },
    };

    const result = BillHelper.formatPDF(bill, {});

    expect(result).toEqual(expected);
  });
});
