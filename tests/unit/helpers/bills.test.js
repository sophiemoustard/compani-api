const expect = require('expect');
const moment = require('moment');
const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const pick = require('lodash/pick');
const omit = require('lodash/omit');

const FundingHistory = require('../../../src/models/FundingHistory');
const BillNumber = require('../../../src/models/BillNumber');
const CreditNote = require('../../../src/models/CreditNote');
const Event = require('../../../src/models/Event');
const Bill = require('../../../src/models/Bill');
const BillingItem = require('../../../src/models/BillingItem');
const Company = require('../../../src/models/Company');
const BillHelper = require('../../../src/helpers/bills');
const BillSlipsHelper = require('../../../src/helpers/billSlips');
const UtilsHelper = require('../../../src/helpers/utils');
const PdfHelper = require('../../../src/helpers/pdf');
const {
  bills: billsData,
  customerId: customerIdData,
  companyId: companyIdData,
} = require('../data/bills');
const BillPdf = require('../../../src/data/pdf/billing/bill');
const SinonMongoose = require('../sinonMongoose');

describe('formatBillNumber', () => {
  it('should return the correct bill number', () => {
    expect(BillHelper.formatBillNumber(105, 'toto', 5)).toEqual('FACT-105toto00005');
    expect(BillHelper.formatBillNumber(105, 'toto', 12345)).toEqual('FACT-105toto12345');
  });
});

describe('formatBilledEvents', () => {
  it('should format events for customer', () => {
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
          inclTaxesCustomer: 12,
          exclTaxesCustomer: 10,
          fundingId: 'fundingId',
          inclTaxesTpp: 5,
          exclTaxesTpp: 4,
        },
        {
          event: '456',
          startDate: '2019-05-29T08:00:55.374Z',
          endDate: '2019-05-29T10:00:55.374Z',
          auxiliary: '34567890',
          inclTaxesCustomer: 14,
          exclTaxesCustomer: 12,
          fundingId: 'fundingId',
          inclTaxesTpp: 3,
          exclTaxesTpp: 2,
        },
      ],
    };

    const result = BillHelper.formatBilledEvents(bill);
    expect(result).toEqual([
      {
        eventId: '123',
        startDate: '2019-05-28T10:00:55.374Z',
        endDate: '2019-05-28T13:00:55.374Z',
        auxiliary: '34567890',
        inclTaxesCustomer: 12,
        exclTaxesCustomer: 10,
      },
      {
        eventId: '456',
        startDate: '2019-05-29T08:00:55.374Z',
        endDate: '2019-05-29T10:00:55.374Z',
        auxiliary: '34567890',
        inclTaxesCustomer: 14,
        exclTaxesCustomer: 12,
      },
    ]);
  });

  it('should format events for tpp with care hours', () => {
    const bill = {
      subscription: {
        _id: 'asd',
        service: {
          _id: '1234567890',
          nature: 'test',
          versions: [{ name: 'service', vat: 12, startDate: moment().toISOString() }],
        },
      },
      thirdPartyPayer: 'client',
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
          inclTaxesCustomer: 12,
          exclTaxesCustomer: 10,
          fundingId: 'fundingId',
          inclTaxesTpp: 5,
          exclTaxesTpp: 4,
          history: { careHours: 0.5 },
        },
        {
          event: '456',
          startDate: '2019-05-29T08:00:55.374Z',
          endDate: '2019-05-29T10:00:55.374Z',
          auxiliary: '34567890',
          inclTaxesCustomer: 14,
          exclTaxesCustomer: 12,
          fundingId: 'fundingId',
          inclTaxesTpp: 3,
          exclTaxesTpp: 2,
          history: { careHours: 2 },
        },
      ],
    };

    const result = BillHelper.formatBilledEvents(bill);
    expect(result).toEqual([
      {
        eventId: '123',
        startDate: '2019-05-28T10:00:55.374Z',
        endDate: '2019-05-28T13:00:55.374Z',
        auxiliary: '34567890',
        fundingId: 'fundingId',
        inclTaxesTpp: 5,
        exclTaxesTpp: 4,
        careHours: 0.5,
      },
      {
        eventId: '456',
        startDate: '2019-05-29T08:00:55.374Z',
        endDate: '2019-05-29T10:00:55.374Z',
        auxiliary: '34567890',
        fundingId: 'fundingId',
        inclTaxesTpp: 3,
        exclTaxesTpp: 2,
        careHours: 2,
      },
    ]);
  });
  it('should format events for tpp without care hours', () => {
    const bill = {
      subscription: {
        _id: 'asd',
        service: {
          _id: '1234567890',
          nature: 'test',
          versions: [{ name: 'service', vat: 12, startDate: moment().toISOString() }],
        },
      },
      thirdPartyPayer: 'client',
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
          inclTaxesCustomer: 12,
          exclTaxesCustomer: 10,
          fundingId: 'fundingId',
          inclTaxesTpp: 5,
          exclTaxesTpp: 4,
        },
        {
          event: '456',
          startDate: '2019-05-29T08:00:55.374Z',
          endDate: '2019-05-29T10:00:55.374Z',
          auxiliary: '34567890',
          inclTaxesCustomer: 14,
          exclTaxesCustomer: 12,
          fundingId: 'fundingId',
          inclTaxesTpp: 3,
          exclTaxesTpp: 2,
        },
      ],
    };

    const result = BillHelper.formatBilledEvents(bill);
    expect(result).toEqual([
      {
        eventId: '123',
        startDate: '2019-05-28T10:00:55.374Z',
        endDate: '2019-05-28T13:00:55.374Z',
        auxiliary: '34567890',
        fundingId: 'fundingId',
        inclTaxesTpp: 5,
        exclTaxesTpp: 4,
      },
      {
        eventId: '456',
        startDate: '2019-05-29T08:00:55.374Z',
        endDate: '2019-05-29T10:00:55.374Z',
        auxiliary: '34567890',
        fundingId: 'fundingId',
        inclTaxesTpp: 3,
        exclTaxesTpp: 2,
      },
    ]);
  });
});

describe('formatSubscriptionData', () => {
  let getMatchingVersionStub;
  let formatBilledEvents;
  beforeEach(() => {
    getMatchingVersionStub = sinon.stub(UtilsHelper, 'getMatchingVersion');
    formatBilledEvents = sinon.stub(BillHelper, 'formatBilledEvents');
  });
  afterEach(() => {
    getMatchingVersionStub.restore();
    formatBilledEvents.restore();
  });

  it('should return formatted subscription data for customer', () => {
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
          inclTaxesCustomer: 12,
          exclTaxesCustomer: 10,
          fundingId: 'fundingId',
          inclTaxesTpp: 5,
          exclTaxesTpp: 4,
        },
        {
          event: '456',
          startDate: '2019-05-29T08:00:55.374Z',
          endDate: '2019-05-29T10:00:55.374Z',
          auxiliary: '34567890',
          inclTaxesCustomer: 14,
          exclTaxesCustomer: 12,
          fundingId: 'fundingId',
          inclTaxesTpp: 3,
          exclTaxesTpp: 2,
        },
      ],
    };
    getMatchingVersionStub.returns({
      _id: '1234567890',
      nature: 'test',
      name: 'service',
      vat: 12,
      startDate: '2019-06-27T10:06:55.374Z',
    });
    formatBilledEvents.returns([{ event: 'event' }]);

    const result = BillHelper.formatSubscriptionData(bill);
    expect(result).toEqual(expect.objectContaining({
      subscription: 'asd',
      service: { serviceId: '1234567890', nature: 'test', name: 'service' },
      exclTaxes: 13.649289099526067,
      inclTaxes: 14.4,
      vat: 12,
      startDate: '2019-06-28T10:06:55.374Z',
      hours: 1.5,
      events: [{ event: 'event' }],
    }));
    sinon.assert.calledWithExactly(getMatchingVersionStub, bill.endDate, bill.subscription.service, 'startDate');
    sinon.assert.calledWithExactly(formatBilledEvents, bill);
  });
  it('should return formatted subscription data for tpp', () => {
    const bill = {
      subscription: {
        _id: 'asd',
        service: {
          _id: '1234567890',
          nature: 'test',
          versions: [{ name: 'service', vat: 12, startDate: moment().toISOString() }],
        },
      },
      thirdPartyPayer: 'client',
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
          inclTaxesCustomer: 12,
          exclTaxesCustomer: 10,
          fundingId: 'fundingId',
          inclTaxesTpp: 5,
          exclTaxesTpp: 4,
        },
        {
          event: '456',
          startDate: '2019-05-29T08:00:55.374Z',
          endDate: '2019-05-29T10:00:55.374Z',
          auxiliary: '34567890',
          inclTaxesCustomer: 14,
          exclTaxesCustomer: 12,
          fundingId: 'fundingId',
          inclTaxesTpp: 3,
          exclTaxesTpp: 2,
        },
      ],
    };
    getMatchingVersionStub.returns({
      _id: '1234567890',
      nature: 'test',
      name: 'service',
      vat: 12,
      startDate: '2019-06-27T10:06:55.374Z',
    });
    formatBilledEvents.returns([{ event: 'event' }]);

    const result = BillHelper.formatSubscriptionData(bill);
    expect(result).toEqual(expect.objectContaining({
      subscription: 'asd',
      service: { serviceId: '1234567890', nature: 'test', name: 'service' },
      exclTaxes: 13.649289099526067,
      inclTaxes: 14.4,
      vat: 12,
      startDate: '2019-06-28T10:06:55.374Z',
      hours: 1.5,
      events: [{ event: 'event' }],
    }));
    sinon.assert.calledWithExactly(getMatchingVersionStub, bill.endDate, bill.subscription.service, 'startDate');
    sinon.assert.calledWithExactly(formatBilledEvents, bill);
  });
});

describe('formatCustomerBills', () => {
  let formatBillNumber;
  let getFixedNumber;
  let formatSubscriptionData;
  beforeEach(() => {
    formatBillNumber = sinon.stub(BillHelper, 'formatBillNumber');
    getFixedNumber = sinon.stub(UtilsHelper, 'getFixedNumber');
    formatSubscriptionData = sinon.stub(BillHelper, 'formatSubscriptionData');
  });
  afterEach(() => {
    formatBillNumber.restore();
    getFixedNumber.restore();
    formatSubscriptionData.restore();
  });

  it('Case 1 : 1 bill', () => {
    const company = { prefixNumber: 1234, _id: new ObjectID() };
    const customer = { _id: 'lilalo' };
    const number = { prefix: 'Picsou', seq: 77 };
    const customerBills = {
      shouldBeSent: true,
      bills: [{
        endDate: '2019-09-19T00:00:00',
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
    formatBillNumber.returns('FACT-1234Picsou00077');
    getFixedNumber.returns(14.40);
    formatSubscriptionData.returns({ subscriptions: 'subscriptions' });

    const result = BillHelper.formatCustomerBills(customerBills, customer, number, company);
    expect(result).toBeDefined();
    expect(result.bill).toBeDefined();
    expect(result.bill).toEqual({
      company: company._id,
      customer: 'lilalo',
      number: 'FACT-1234Picsou00077',
      shouldBeSent: true,
      subscriptions: [{ subscriptions: 'subscriptions' }],
      type: 'automatic',
      netInclTaxes: 14.40,
      date: '2019-09-19T00:00:00',
    });
    expect(result.billedEvents).toBeDefined();
    expect(result.billedEvents).toMatchObject({
      123: { event: '123', inclTaxesTpp: 14.4 },
      456: { event: '456', inclTaxesTpp: 12 },
    });
    sinon.assert.calledWithExactly(formatBillNumber, 1234, 'Picsou', 77);
    sinon.assert.calledWithExactly(getFixedNumber, 14.4, 2);
    sinon.assert.calledWithExactly(formatSubscriptionData, customerBills.bills[0]);
  });

  it('Case 2 : multiple bills', () => {
    const company = { prefixNumber: 1234, _id: new ObjectID() };
    const customer = { _id: 'lilalo' };
    const number = { prefix: 'Picsou', seq: 77 };
    const customerBills = {
      total: 14.4,
      shouldBeSent: false,
      bills: [{
        endDate: '2019-09-19T00:00:00',
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
        endDate: '2019-09-19T00:00:00',
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
    formatBillNumber.returns('FACT-1234Picsou00077');
    getFixedNumber.returns(14.40);
    formatSubscriptionData.returns({ subscriptions: 'subscriptions' });

    const result = BillHelper.formatCustomerBills(customerBills, customer, number, company);
    expect(result).toBeDefined();
    expect(result.bill).toBeDefined();
    expect(result.bill).toMatchObject({
      company: company._id,
      customer: 'lilalo',
      number: 'FACT-1234Picsou00077',
      shouldBeSent: false,
      date: '2019-09-19T00:00:00',
      netInclTaxes: 14.40,
      subscriptions: [{ subscriptions: 'subscriptions' }, { subscriptions: 'subscriptions' }],
    });
    expect(result.billedEvents).toBeDefined();
    expect(result.billedEvents).toMatchObject({
      123: { event: '123', inclTaxesTpp: 14.4 },
      456: { event: '456', inclTaxesTpp: 12 },
      890: { event: '890', inclTaxesTpp: 45 },
      736: { event: '736', inclTaxesTpp: 23 },
    });
    sinon.assert.calledWithExactly(formatBillNumber, 1234, 'Picsou', 77);
    sinon.assert.calledWithExactly(getFixedNumber, 14.4, 2);
    sinon.assert.calledWithExactly(formatSubscriptionData.getCall(0), customerBills.bills[0]);
    sinon.assert.calledWithExactly(formatSubscriptionData.getCall(1), customerBills.bills[1]);
  });
});

describe('formatThirdPartyPayerBills', () => {
  let getFixedNumber;
  let formatBillNumber;
  let formatSubscriptionData;
  beforeEach(() => {
    getFixedNumber = sinon.stub(UtilsHelper, 'getFixedNumber');
    formatBillNumber = sinon.stub(BillHelper, 'formatBillNumber');
    formatSubscriptionData = sinon.stub(BillHelper, 'formatSubscriptionData');
  });
  afterEach(() => {
    getFixedNumber.restore();
    formatBillNumber.restore();
    formatSubscriptionData.restore();
  });

  it('Case 1 : 1 third party payer - 1 bill - Funding monthly and hourly', () => {
    const company = { prefixNumber: 1234, _id: new ObjectID() };
    const customer = { _id: 'lilalo' };
    const number = { prefix: 'Picsou', seq: 77 };
    const thirdPartyPayerBills = [{
      total: 14.4,
      bills: [{
        endDate: '2019-09-19T00:00:00',
        thirdPartyPayer: { _id: 'Papa' },
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
    formatBillNumber.returns('FACT-1234Picsou00077');
    getFixedNumber.returns(14.40);
    formatSubscriptionData.returns({ subscriptions: 'subscriptions' });

    const result = BillHelper.formatThirdPartyPayerBills(thirdPartyPayerBills, customer, number, company);
    expect(result).toBeDefined();
    expect(result.tppBills).toBeDefined();
    expect(result.tppBills[0]).toMatchObject({
      company: company._id,
      customer: 'lilalo',
      number: 'FACT-1234Picsou00077',
      thirdPartyPayer: 'Papa',
      date: '2019-09-19T00:00:00',
      netInclTaxes: 14.40,
      subscriptions: [{ subscriptions: 'subscriptions' }],
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
    sinon.assert.calledWithExactly(getFixedNumber, 14.4, 2);
    sinon.assert.calledWithExactly(formatBillNumber, 1234, 'Picsou', 77);
    sinon.assert.calledWithExactly(formatSubscriptionData, thirdPartyPayerBills[0].bills[0]);
  });
  it('Case 2 : 1 third party payer - 1 bill - Funding once and hourly', () => {
    const company = { prefixNumber: 1234, _id: new ObjectID() };
    const customer = { _id: 'lilalo' };
    const number = { prefix: 'Picsou', seq: 77 };
    const thirdPartyPayerBills = [{
      total: 14.4,
      bills: [{
        endDate: '2019-09-19T00:00:00',
        thirdPartyPayer: { _id: 'Papa' },
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
    formatBillNumber.returns('FACT-1234Picsou00077');
    getFixedNumber.returns(14.40);
    formatSubscriptionData.returns({ subscriptions: 'subscriptions' });

    const result = BillHelper.formatThirdPartyPayerBills(thirdPartyPayerBills, customer, number, company);
    expect(result).toBeDefined();
    expect(result.tppBills).toBeDefined();
    expect(result.tppBills[0]).toMatchObject({
      company: company._id,
      customer: 'lilalo',
      number: 'FACT-1234Picsou00077',
      thirdPartyPayer: 'Papa',
      date: '2019-09-19T00:00:00',
      netInclTaxes: 14.40,
      subscriptions: [{ subscriptions: 'subscriptions' }],
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
    sinon.assert.calledWithExactly(getFixedNumber, 14.4, 2);
    sinon.assert.calledWithExactly(formatBillNumber, 1234, 'Picsou', 77);
    sinon.assert.calledWithExactly(formatSubscriptionData, thirdPartyPayerBills[0].bills[0]);
  });
  it('Case 3 : 1 third party payer - 1 bill - Funding once and fixed', () => {
    const company = { prefixNumber: 1234, _id: new ObjectID() };
    const customer = { _id: 'lilalo' };
    const number = { prefix: 'Picsou', seq: 77 };
    const thirdPartyPayerBills = [{
      total: 14.4,
      bills: [{
        endDate: '2019-09-19T00:00:00',
        thirdPartyPayer: { _id: 'Papa' },
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
    formatBillNumber.returns('FACT-1234Picsou00077');
    getFixedNumber.returns(14.40);
    formatSubscriptionData.returns({ subscriptions: 'subscriptions' });

    const result = BillHelper.formatThirdPartyPayerBills(thirdPartyPayerBills, customer, number, company);
    expect(result).toBeDefined();
    expect(result.tppBills).toBeDefined();
    expect(result.tppBills[0]).toMatchObject({
      company: company._id,
      customer: 'lilalo',
      number: 'FACT-1234Picsou00077',
      thirdPartyPayer: 'Papa',
      date: '2019-09-19T00:00:00',
      netInclTaxes: 14.40,
      subscriptions: [{ subscriptions: 'subscriptions' }],
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
    sinon.assert.calledWithExactly(getFixedNumber, 14.4, 2);
    sinon.assert.calledWithExactly(formatBillNumber, 1234, 'Picsou', 77);
    sinon.assert.calledWithExactly(formatSubscriptionData, thirdPartyPayerBills[0].bills[0]);
  });
  it('Case 4 : 1 third party payer - multiple bills', () => {
    const company = { _id: new ObjectID(), prefixNumber: 1234 };
    const customer = { _id: 'lilalo' };
    const number = { prefix: 'Picsou', seq: 77 };
    const thirdPartyPayerBills = [{
      total: 14.4,
      bills: [{
        endDate: '2019-09-19T00:00:00',
        thirdPartyPayer: { _id: 'Papa' },
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
        thirdPartyPayer: { _id: 'Papa' },
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
    formatBillNumber.returns('FACT-1234Picsou00077');
    getFixedNumber.returns(14.40);
    formatSubscriptionData.returns({ subscriptions: 'subscriptions' });

    const result = BillHelper.formatThirdPartyPayerBills(thirdPartyPayerBills, customer, number, company);
    expect(result).toBeDefined();
    expect(result.tppBills).toBeDefined();
    expect(result.tppBills[0]).toMatchObject({
      company: company._id,
      customer: 'lilalo',
      number: 'FACT-1234Picsou00077',
      thirdPartyPayer: 'Papa',
      date: '2019-09-19T00:00:00',
      netInclTaxes: 14.40,
      subscriptions: [{ subscriptions: 'subscriptions' }, { subscriptions: 'subscriptions' }],
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
    sinon.assert.calledWithExactly(getFixedNumber, 14.4, 2);
    sinon.assert.calledWithExactly(formatBillNumber, 1234, 'Picsou', 77);
    sinon.assert.calledWithExactly(formatSubscriptionData.getCall(0), thirdPartyPayerBills[0].bills[0]);
    sinon.assert.calledWithExactly(formatSubscriptionData.getCall(1), thirdPartyPayerBills[0].bills[1]);
  });
  it('Case 5 : multiple third party payers', () => {
    const company = { _id: new ObjectID(), prefixNumber: 1234 };
    const customer = { _id: 'lilalo' };
    const number = { prefix: 'Picsou', seq: 77 };
    const thirdPartyPayerBills = [{
      total: 14.4,
      bills: [{
        endDate: '2019-09-19T00:00:00',
        thirdPartyPayer: { _id: 'Papa' },
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
        thirdPartyPayer: { _id: 'Papa' },
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
    formatBillNumber.returns('FACT-1234Picsou00077');
    getFixedNumber.returns(14.40);
    formatSubscriptionData.returns({ subscriptions: 'subscriptions' });

    const result = BillHelper.formatThirdPartyPayerBills(thirdPartyPayerBills, customer, number, company);
    expect(result).toBeDefined();
    expect(result.tppBills).toBeDefined();
    expect(result.tppBills.length).toEqual(2);
    sinon.assert.calledWithExactly(getFixedNumber, 14.4, 2);
    sinon.assert.calledWithExactly(formatBillNumber.getCall(0), 1234, 'Picsou', 77);
    sinon.assert.calledWithExactly(formatBillNumber.getCall(1), 1234, 'Picsou', 78);
    sinon.assert.calledWithExactly(formatSubscriptionData.getCall(0), thirdPartyPayerBills[0].bills[0]);
    sinon.assert.calledWithExactly(formatSubscriptionData.getCall(1), thirdPartyPayerBills[1].bills[0]);
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
  it('should update list of histories', async () => {
    const companyId = new ObjectID();
    const histories = {
      1: { amountTTC: 12 },
      2: { careHours: 12 },
      3: { 11: { careHours: 12 }, 12: { careHours: 18 } },
    };

    await BillHelper.updateFundingHistories(histories, companyId);

    sinon.assert.callCount(updateOne, 4);
    sinon.assert.calledWithExactly(
      updateOne.getCall(0),
      { fundingId: '1', company: companyId },
      { $inc: { amountTTC: 12 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    sinon.assert.calledWithExactly(
      updateOne.getCall(1),
      { fundingId: '2', company: companyId },
      { $inc: { careHours: 12 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    sinon.assert.calledWithExactly(
      updateOne.getCall(2),
      { fundingId: '3', company: companyId, month: '11' },
      { $inc: { careHours: 12 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    sinon.assert.calledWithExactly(
      updateOne.getCall(3),
      { fundingId: '3', company: companyId, month: '12' },
      { $inc: { careHours: 18 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  });
});

describe('getBillNumber', () => {
  let findOneAndUpdateBillNumber;
  beforeEach(() => {
    findOneAndUpdateBillNumber = sinon.stub(BillNumber, 'findOneAndUpdate');
  });
  afterEach(() => {
    findOneAndUpdateBillNumber.restore();
  });

  it('should return a bill number', async () => {
    const companyId = new ObjectID();
    const prefix = '1119';
    const billNumber = { prefix, seq: 1 };

    findOneAndUpdateBillNumber.returns(SinonMongoose.stubChainedQueries([billNumber], ['lean']));

    const result = await BillHelper.getBillNumber(new Date('2019-11-15'), companyId);
    expect(result).toEqual(billNumber);
    SinonMongoose.calledWithExactly(findOneAndUpdateBillNumber, [
      {
        query: 'findOneAndUpdate',
        args: [{ prefix, company: companyId }, {}, { new: true, upsert: true, setDefaultsOnInsert: true }],
      },
      { query: 'lean' },
    ]);
  });
});

describe('formatAndCreateList', () => {
  let updateOneBillNumber;
  let updateManyCreditNote;
  let insertManyBill;
  let getBillNumberStub;
  let formatCustomerBillsStub;
  let formatThirdPartyPayerBillsStub;
  let updateFundingHistoriesStub;
  let updateEventsStub;
  let createBillSlips;
  beforeEach(() => {
    updateOneBillNumber = sinon.stub(BillNumber, 'updateOne');
    updateManyCreditNote = sinon.stub(CreditNote, 'updateMany');
    insertManyBill = sinon.stub(Bill, 'insertMany');
    getBillNumberStub = sinon.stub(BillHelper, 'getBillNumber');
    formatCustomerBillsStub = sinon.stub(BillHelper, 'formatCustomerBills');
    formatThirdPartyPayerBillsStub = sinon.stub(BillHelper, 'formatThirdPartyPayerBills');
    updateFundingHistoriesStub = sinon.stub(BillHelper, 'updateFundingHistories');
    updateEventsStub = sinon.stub(BillHelper, 'updateEvents');
    createBillSlips = sinon.stub(BillSlipsHelper, 'createBillSlips');
  });
  afterEach(() => {
    updateOneBillNumber.restore();
    updateManyCreditNote.restore();
    insertManyBill.restore();
    getBillNumberStub.restore();
    formatCustomerBillsStub.restore();
    formatThirdPartyPayerBillsStub.restore();
    updateFundingHistoriesStub.restore();
    updateEventsStub.restore();
    createBillSlips.restore();
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
        thirdPartyPayer: tppBill.thirdPartyPayer._id,
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
    const eventsToUpdate = { ...customerBillingInfo.billedEvents, ...tppBillingInfo.billedEvents };

    getBillNumberStub.returns(number);
    formatCustomerBillsStub.returns(customerBillingInfo);
    formatThirdPartyPayerBillsStub.returns(tppBillingInfo);

    await BillHelper.formatAndCreateList(billsData, credentials);

    sinon.assert.calledWithExactly(
      createBillSlips,
      [customerBillingInfo.bill, ...tppBillingInfo.tppBills],
      billsData[0].endDate,
      credentials.company
    );
    sinon.assert.calledWithExactly(getBillNumberStub, billsData[0].endDate, companyId);
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
      eventsToUpdate
    );
    sinon.assert.calledOnceWithExactly(
      updateOneBillNumber,
      { prefix: number.prefix, company: credentials.company._id }, { $set: { seq: 3 } }
    );
    sinon.assert.calledOnceWithExactly(
      updateManyCreditNote,
      { events: { $elemMatch: { eventId: { $in: Object.keys(eventsToUpdate) } } } },
      { isEditable: false }
    );
    sinon.assert.calledOnceWithExactly(insertManyBill, [customerBillingInfo.bill, ...tppBillingInfo.tppBills]);
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

    await BillHelper.formatAndCreateList([omit(billsData[0], 'thirdPartyPayerBills')], credentials);

    sinon.assert.calledWithExactly(
      createBillSlips,
      [customerBillingInfo.bill],
      billsData[0].endDate,
      credentials.company
    );
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
    sinon.assert.calledOnceWithExactly(
      updateOneBillNumber,
      { prefix: number.prefix, company: credentials.company._id }, { $set: { seq: 2 } }
    );
    sinon.assert.calledOnceWithExactly(
      updateManyCreditNote,
      { events: { $elemMatch: { eventId: { $in: Object.keys({ ...customerBillingInfo.billedEvents }) } } } },
      { isEditable: false }
    );
    sinon.assert.calledOnceWithExactly(insertManyBill, [customerBillingInfo.bill]);
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
        thirdPartyPayer: tppBill.thirdPartyPayer._id,
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

    await BillHelper.formatAndCreateList([{ ...billsData[0], customerBills: {} }], credentials);

    sinon.assert.calledWithExactly(
      createBillSlips,
      tppBillingInfo.tppBills,
      billsData[0].endDate,
      credentials.company
    );
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
    sinon.assert.calledOnceWithExactly(
      updateOneBillNumber,
      { prefix: number.prefix, company: credentials.company._id }, { $set: { seq: 2 } }
    );
    sinon.assert.calledOnceWithExactly(
      updateManyCreditNote,
      { events: { $elemMatch: { eventId: { $in: Object.keys({ ...tppBillingInfo.billedEvents }) } } } },
      { isEditable: false }
    );
    sinon.assert.calledOnceWithExactly(insertManyBill, tppBillingInfo.tppBills);
  });

  describe('Functions not called', () => {
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
        thirdPartyPayer: tppBill.thirdPartyPayer._id,
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
    const eventsToUpdate = { ...customerBillingInfo.billedEvents, ...tppBillingInfo.billedEvents };

    it('should not call functions if there is an error at Bill.insertMany (order matters)', async () => {
      try {
        getBillNumberStub.returns(number);
        formatCustomerBillsStub.returns(customerBillingInfo);
        formatThirdPartyPayerBillsStub.returns(tppBillingInfo);
        insertManyBill.throws('insertManyError');

        await BillHelper.formatAndCreateList(billsData, credentials);
      } catch (e) {
        expect(e.name).toEqual('insertManyError');
      } finally {
        sinon.assert.notCalled(updateEventsStub);
        sinon.assert.notCalled(updateFundingHistoriesStub);
        sinon.assert.notCalled(createBillSlips);
        sinon.assert.notCalled(updateOneBillNumber);
        sinon.assert.notCalled(updateManyCreditNote);
        sinon.assert.calledOnceWithExactly(insertManyBill, [customerBillingInfo.bill, ...tppBillingInfo.tppBills]);
      }
    });

    it('should not call functions if there is an error at updateEvents (order matters)', async () => {
      try {
        getBillNumberStub.returns(number);
        formatCustomerBillsStub.returns(customerBillingInfo);
        formatThirdPartyPayerBillsStub.returns(tppBillingInfo);
        updateEventsStub.throws('updateEventError');

        await BillHelper.formatAndCreateList(billsData, credentials);
      } catch (e) {
        expect(e.name).toEqual('updateEventError');
      } finally {
        sinon.assert.calledWithExactly(updateEventsStub, eventsToUpdate);
        sinon.assert.notCalled(updateFundingHistoriesStub);
        sinon.assert.notCalled(createBillSlips);
        sinon.assert.notCalled(updateOneBillNumber);
        sinon.assert.notCalled(updateManyCreditNote);
        sinon.assert.calledOnceWithExactly(insertManyBill, [customerBillingInfo.bill, ...tppBillingInfo.tppBills]);
      }
    });

    it('should not call functions if there is an error at updateFundingHistories (order matters)', async () => {
      try {
        getBillNumberStub.returns(number);
        formatCustomerBillsStub.returns(customerBillingInfo);
        formatThirdPartyPayerBillsStub.returns(tppBillingInfo);
        updateFundingHistoriesStub.throws('updateFundingHistoriesError');

        await BillHelper.formatAndCreateList(billsData, credentials);
      } catch (e) {
        expect(e.name).toEqual('updateFundingHistoriesError');
      } finally {
        sinon.assert.calledWithExactly(updateEventsStub, eventsToUpdate);
        sinon.assert.calledWithExactly(updateFundingHistoriesStub, {}, companyId);
        sinon.assert.notCalled(createBillSlips);
        sinon.assert.notCalled(updateOneBillNumber);
        sinon.assert.notCalled(updateManyCreditNote);
        sinon.assert.calledOnceWithExactly(insertManyBill, [customerBillingInfo.bill, ...tppBillingInfo.tppBills]);
      }
    });

    it('should not call functions if there is an error at BillNumber.updateOne (order matters)', async () => {
      try {
        getBillNumberStub.returns(number);
        formatCustomerBillsStub.returns(customerBillingInfo);
        formatThirdPartyPayerBillsStub.returns(tppBillingInfo);
        updateOneBillNumber.throws('updateOneError');

        await BillHelper.formatAndCreateList(billsData, credentials);
      } catch (e) {
        expect(e.name).toEqual('updateOneError');
      } finally {
        sinon.assert.calledWithExactly(updateEventsStub, eventsToUpdate);
        sinon.assert.calledWithExactly(updateFundingHistoriesStub, {}, companyId);
        sinon.assert.notCalled(createBillSlips);
        sinon.assert.notCalled(updateManyCreditNote);
        sinon.assert.calledOnceWithExactly(insertManyBill, [customerBillingInfo.bill, ...tppBillingInfo.tppBills]);
        sinon.assert.calledOnceWithExactly(
          updateOneBillNumber,
          { prefix: number.prefix, company: companyId }, { $set: { seq: number.seq } }
        );
      }
    });

    it('should not call functions if there is an error at createBillSlips (order matters)', async () => {
      try {
        getBillNumberStub.returns(number);
        formatCustomerBillsStub.returns(customerBillingInfo);
        formatThirdPartyPayerBillsStub.returns(tppBillingInfo);
        createBillSlips.throws('createBillSlipsError');

        await BillHelper.formatAndCreateList(billsData, credentials);
      } catch (e) {
        expect(e.name).toEqual('createBillSlipsError');
      } finally {
        sinon.assert.calledWithExactly(updateEventsStub, eventsToUpdate);
        sinon.assert.calledWithExactly(updateFundingHistoriesStub, {}, companyId);
        sinon.assert.calledWithExactly(
          createBillSlips,
          [customerBillingInfo.bill, ...tppBillingInfo.tppBills],
          billsData[0].endDate,
          credentials.company
        );
        sinon.assert.notCalled(updateManyCreditNote);
        sinon.assert.calledOnceWithExactly(insertManyBill, [customerBillingInfo.bill, ...tppBillingInfo.tppBills]);
        sinon.assert.calledOnceWithExactly(
          updateOneBillNumber,
          { prefix: number.prefix, company: companyId }, { $set: { seq: number.seq } }
        );
      }
    });
  });
});

describe('list', () => {
  let findBill;
  beforeEach(() => {
    findBill = sinon.stub(Bill, 'find');
  });
  afterEach(() => {
    findBill.restore();
  });

  it('should get a list of manual bills', async () => {
    const authCompanyId = new ObjectID();
    const query = { type: 'manual' };
    const credentials = { company: authCompanyId };
    const bills = [
      { _id: new ObjectID(), type: 'manual', billingItemList: [] },
      { _id: new ObjectID(), type: 'manual', billingItemList: [] },
    ];

    findBill.returns(SinonMongoose.stubChainedQueries([bills]));

    await BillHelper.list(query, credentials);

    SinonMongoose.calledWithExactly(
      findBill,
      [
        { query: 'find', args: [{ type: 'manual', company: authCompanyId }] },
        { query: 'populate', args: [{ path: 'customer', select: 'identity' }] },
        { query: 'populate', args: [{ path: 'billingItemList', populate: { path: 'billingItem', select: 'name' } }] },
        { query: 'lean' },
      ]
    );
  });
});

describe('formatBillingItem', () => {
  it('should format billing item', () => {
    const billingItemId = new ObjectID();
    const billingItem = { billingItem: billingItemId, count: 3, unitInclTaxes: 60 };
    const list = [
      { _id: billingItemId, name: 'bonjour', vat: 20 },
      { _id: new ObjectID(), name: 'au revoir', vat: 40 },
    ];

    const result = BillHelper.formatBillingItem(billingItem, list);

    expect(result).toEqual({
      billingItem: billingItemId,
      name: 'bonjour',
      unitInclTaxes: 60,
      count: 3,
      inclTaxes: 180,
      exclTaxes: 150,
      vat: 20,
    });
  });
});

describe('formatAndCreateBill', () => {
  let getBillNumber;
  let formatBillNumber;
  let formatBillingItem;
  let findBillingItem;
  let updateOneBillNumber;
  let create;
  beforeEach(() => {
    getBillNumber = sinon.stub(BillHelper, 'getBillNumber');
    formatBillNumber = sinon.stub(BillHelper, 'formatBillNumber');
    formatBillingItem = sinon.stub(BillHelper, 'formatBillingItem');
    findBillingItem = sinon.stub(BillingItem, 'find');
    updateOneBillNumber = sinon.stub(BillNumber, 'updateOne');
    create = sinon.stub(Bill, 'create');
  });

  afterEach(() => {
    getBillNumber.restore();
    formatBillNumber.restore();
    formatBillingItem.restore();
    findBillingItem.restore();
    updateOneBillNumber.restore();
    create.restore();
  });

  it('should format and create a bill', async () => {
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId, prefixNumber: '101' } };
    const billingItemId1 = new ObjectID();
    const billingItemId2 = new ObjectID();
    const payload = {
      customer: new ObjectID(),
      date: '2021-09-01',
      billingItemList: [
        { billingItem: billingItemId1, unitInclTaxes: 10, count: 2 },
        { billingItem: billingItemId2, unitInclTaxes: 30, count: 1 },
      ],
      netInclTaxes: 50,
    };

    getBillNumber.returns({ prefix: 'FACT-101', seq: 1 });
    formatBillNumber.returns('FACT-101092100001');
    findBillingItem.returns(
      SinonMongoose.stubChainedQueries([[{ _id: billingItemId1, vat: 10 }, { _id: billingItemId2, vat: 25 }]], ['lean'])
    );
    formatBillingItem.onCall(0).returns({ inclTaxes: 180 });
    formatBillingItem.onCall(1).returns({ inclTaxes: 150 });

    await BillHelper.formatAndCreateBill(payload, credentials);

    sinon.assert.calledOnceWithExactly(getBillNumber, '2021-09-01', companyId);
    sinon.assert.calledOnceWithExactly(formatBillNumber, '101', 'FACT-101', 1);
    SinonMongoose.calledWithExactly(
      findBillingItem,
      [
        { query: 'find', args: [{ _id: { $in: [billingItemId1, billingItemId2] } }, { vat: 1, name: 1 }] },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledOnceWithExactly(
      updateOneBillNumber,
      { prefix: 'FACT-101', company: companyId },
      { $set: { seq: 2 } }
    );
    sinon.assert.calledWithExactly(
      formatBillingItem.getCall(0),
      { billingItem: billingItemId1, unitInclTaxes: 10, count: 2 },
      [{ _id: billingItemId1, vat: 10 }, { _id: billingItemId2, vat: 25 }]
    );
    sinon.assert.calledWithExactly(
      formatBillingItem.getCall(1),
      { billingItem: billingItemId2, unitInclTaxes: 30, count: 1 },
      [{ _id: billingItemId1, vat: 10 }, { _id: billingItemId2, vat: 25 }]
    );
    sinon.assert.calledOnceWithExactly(
      create,
      {
        number: 'FACT-101092100001',
        date: '2021-09-01',
        customer: payload.customer,
        netInclTaxes: 50,
        type: 'manual',
        billingItemList: [{ inclTaxes: 180 }, { inclTaxes: 150 }],
        company: companyId,
      }
    );
  });
});

describe('getBills', () => {
  let findBill;
  let getDateQueryStub;
  const credentials = { company: { _id: new ObjectID() } };
  const bills = [{ _id: new ObjectID() }, { _id: new ObjectID() }];

  beforeEach(() => {
    findBill = sinon.stub(Bill, 'find');
    getDateQueryStub = sinon.stub(UtilsHelper, 'getDateQuery');
  });

  afterEach(() => {
    findBill.restore();
    getDateQueryStub.restore();
  });

  it('should return bills', async () => {
    findBill.returns(SinonMongoose.stubChainedQueries([bills]));

    const result = await BillHelper.getBills({}, credentials);

    expect(result).toEqual(bills);
    sinon.assert.notCalled(getDateQueryStub);
    SinonMongoose.calledWithExactly(findBill, [
      { query: 'find', args: [{ company: credentials.company._id }] },
      { query: 'populate', args: [{ path: 'thirdPartyPayer', select: '_id name' }] },
      { query: 'lean' },
    ]);
  });

  it('should return bills at specified start date', async () => {
    const query = { startDate: new Date('2019-11-01') };
    const dateQuery = { $lte: query.startDate };

    getDateQueryStub.returns(dateQuery);
    findBill.returns(SinonMongoose.stubChainedQueries([bills]));

    const result = await BillHelper.getBills(query, credentials);

    expect(result).toEqual(bills);
    SinonMongoose.calledWithExactly(findBill, [
      { query: 'find', args: [{ company: credentials.company._id, date: dateQuery }] },
      { query: 'populate', args: [{ path: 'thirdPartyPayer', select: '_id name' }] },
      { query: 'lean' },
    ]);
    sinon.assert.calledWithExactly(getDateQueryStub, { ...query, endDate: undefined });
  });

  it('should return bills at specified end date', async () => {
    const query = { endDate: new Date('2019-11-01') };
    const dateQuery = { $gte: query.endDate };

    getDateQueryStub.returns(dateQuery);
    findBill.returns(SinonMongoose.stubChainedQueries([bills]));

    const result = await BillHelper.getBills(query, credentials);

    expect(result).toEqual(bills);
    SinonMongoose.calledWithExactly(findBill, [
      { query: 'find', args: [{ company: credentials.company._id, date: dateQuery }] },
      { query: 'populate', args: [{ path: 'thirdPartyPayer', select: '_id name' }] },
      { query: 'lean' },
    ]);
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
      thirdPartyPayer: { _id: new ObjectID() },
      customer: { fundings: [{ thirdPartyPayer: new ObjectID() }] },
    };
    const subscription = { unitInclTaxes: 20 };
    const result = BillHelper.getUnitInclTaxes(bill, subscription);

    expect(result).toBeDefined();
    expect(result).toBe(0);
    sinon.assert.notCalled(getLastVersion);
  });

  it('should return subscription unitInclTaxes for FIXED funding', () => {
    const tppId = new ObjectID();
    const bill = {
      thirdPartyPayer: { _id: tppId },
      customer: { fundings: [{ thirdPartyPayer: tppId, nature: 'fixed', versions: [{ amountTTC: 14.4 }] }] },
    };
    const subscription = { vat: 20, unitInclTaxes: 12 };

    getLastVersion.returns({ amountTTC: 14.4 });

    const result = BillHelper.getUnitInclTaxes(bill, subscription);

    expect(result).toBeDefined();
    expect(result).toBe(12);
    sinon.assert.calledOnceWithExactly(getLastVersion, [{ amountTTC: 14.4 }], 'createdAt');
  });

  it('should return unit incl taxes from funding if HOURLY funding', () => {
    const tppId = new ObjectID();
    const bill = {
      thirdPartyPayer: { _id: tppId },
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

describe('computeSurcharge', () => {
  it('should compute surcharges on an entire event', () => {
    const subscription = {
      unitInclTaxes: 24.47,
      vat: 5.5,
      service: { name: 'Temps de qualité - autonomie', nature: 'hourly' },
      events: [{
        _id: new ObjectID(),
        startDate: '2019-09-15T05:00:00.000+00:00',
        endDate: '2019-09-15T07:00:00.000+00:00',
        surcharges: [{ _id: new ObjectID(), percentage: 25, name: 'Dimanche' }],
      }],
    };

    const totalSurcharge = BillHelper.computeSurcharge(subscription);

    expect(totalSurcharge).toEqual(12.235);
  });

  it('should compute surcharges on a part of an event', () => {
    const subscription = {
      unitInclTaxes: 24.47,
      vat: 5.5,
      service: { name: 'Temps de qualité - autonomie', nature: 'hourly' },
      events: [{
        _id: new ObjectID(),
        startDate: '2019-09-15T19:00:00.000+00:00',
        endDate: '2019-09-15T21:15:00.000+00:00',
        surcharges: [{
          _id: new ObjectID(),
          startHour: '2019-09-15T20:00:00.000+00:00',
          endHour: '2019-09-15T21:15:00.000+00:00',
          percentage: 25,
          name: 'Soirée',
        }],
      }],
    };

    const totalSurcharge = BillHelper.computeSurcharge(subscription);

    expect(totalSurcharge).toEqual(7.646875);
  });

  it('should not compute totalSurcharges if there is no surcharge in a subscription', () => {
    const subscription = {
      unitInclTaxes: 24.47,
      vat: 5.5,
      service: { name: 'Temps de qualité - autonomie', nature: 'hourly' },
      events: [{
        _id: new ObjectID(),
        startDate: '2019-09-15T05:00:00.000+00:00',
        endDate: '2019-09-15T07:00:00.000+00:00',
      }],
    };

    const totalSurcharge = BillHelper.computeSurcharge(subscription);

    expect(totalSurcharge).toEqual(0);
  });
});

describe('formatBillDetailsForPdf', () => {
  let getUnitInclTaxes;
  let computeSurcharge;
  let formatPrice;
  let formatHour;
  beforeEach(() => {
    getUnitInclTaxes = sinon.stub(BillHelper, 'getUnitInclTaxes');
    computeSurcharge = sinon.stub(BillHelper, 'computeSurcharge');
    formatPrice = sinon.stub(UtilsHelper, 'formatPrice');
    formatHour = sinon.stub(UtilsHelper, 'formatHour');
  });
  afterEach(() => {
    getUnitInclTaxes.restore();
    computeSurcharge.restore();
    formatPrice.restore();
    formatHour.restore();
  });

  it('should return formatted details if service.nature is hourly', () => {
    const bill = {
      subscriptions: [{
        unitInclTaxes: 24.47,
        vat: 5.5,
        service: { name: 'Temps de qualité - autonomie', nature: 'hourly' },
        hours: 18,
        exclTaxes: 430.5444,
        inclTaxes: 454.2243,
      }],
    };

    getUnitInclTaxes.returns(24.47);
    formatHour.onCall(0).returns('18,00 h');
    computeSurcharge.returns(0);
    formatPrice.onCall(0).returns('430,54 €');
    formatPrice.onCall(1).returns('23,68 €');

    const formattedBillDetails = BillHelper.formatBillDetailsForPdf(bill);

    expect(formattedBillDetails).toEqual({
      formattedDetails: [{
        unitInclTaxes: 24.47,
        vat: 5.5,
        name: 'Temps de qualité - autonomie',
        volume: '18,00 h',
        total: 440.46,
      }],
      totalExclTaxes: '430,54 €',
      totalVAT: '23,68 €',
    });

    sinon.assert.calledOnceWithExactly(computeSurcharge, bill.subscriptions[0]);
  });

  it('should return formatted details if service.nature is fixed', () => {
    const bill = {
      subscriptions: [{
        unitInclTaxes: 22,
        vat: 5.5,
        service: { name: 'Forfait nuit', nature: 'fixed' },
        hours: 0,
        exclTaxes: 20.3,
        inclTaxes: 22,
        events: [{ startDate: '2019-09-15T05:00:00.000+00:00', endDate: '2019-09-15T05:00:00.000+00:00' }],
      }],
    };

    getUnitInclTaxes.returns(22);
    computeSurcharge.returns(0);
    formatPrice.onCall(0).returns('20,30 €');
    formatPrice.onCall(1).returns('1,70 €');

    const formattedBillDetails = BillHelper.formatBillDetailsForPdf(bill);

    expect(formattedBillDetails).toEqual({
      formattedDetails: [{
        unitInclTaxes: 22,
        vat: 5.5,
        name: 'Forfait nuit',
        volume: 1,
        total: 22,
      }],
      totalExclTaxes: '20,30 €',
      totalVAT: '1,70 €',
    });

    sinon.assert.calledOnceWithExactly(computeSurcharge, bill.subscriptions[0]);
    sinon.assert.notCalled(formatHour);
  });

  it('should return formatted details if customer has discounts', () => {
    const bill = {
      subscriptions: [{
        unitInclTaxes: 24.47,
        vat: 5.5,
        service: { name: 'Temps de qualité - autonomie', nature: 'hourly' },
        hours: 18,
        exclTaxes: 430.5444,
        inclTaxes: 454.2243,
        discount: -5,
      }],
    };

    getUnitInclTaxes.returns(24.47);
    formatHour.onCall(0).returns('18,00 h');
    computeSurcharge.returns(0);
    formatPrice.onCall(0).returns('430,54 €');
    formatPrice.onCall(1).returns('23,68 €');

    const formattedBillDetails = BillHelper.formatBillDetailsForPdf(bill);

    expect(formattedBillDetails).toEqual({
      formattedDetails: [
        {
          unitInclTaxes: 24.47,
          vat: 5.5,
          name: 'Temps de qualité - autonomie',
          volume: '18,00 h',
          total: 440.46,
        },
        { name: 'Remises', total: 5 },
      ],
      totalExclTaxes: '430,54 €',
      totalVAT: '23,68 €',
    });

    sinon.assert.calledOnceWithExactly(computeSurcharge, bill.subscriptions[0]);
  });
  it('should return formatted details if there are surcharged interventions', () => {
    const bill = {
      subscriptions: [{
        unitInclTaxes: 24.47,
        vat: 5.5,
        service: { name: 'Temps de qualité - autonomie', nature: 'hourly' },
        hours: 18,
        exclTaxes: 430.5444,
        inclTaxes: 454.2243,
        events: [{
          _id: new ObjectID(),
          startDate: '2019-09-15T05:00:00.000+00:00',
          endDate: '2019-09-15T07:00:00.000+00:00',
          surcharges: [{ _id: new ObjectID(), percentage: 25, name: 'Dimanche' }],
        }],
      }],
    };

    getUnitInclTaxes.returns(24.47);
    formatHour.onCall(0).returns('18,00 h');
    computeSurcharge.returns(12.24);
    formatPrice.onCall(0).returns('430,54 €');
    formatPrice.onCall(1).returns('23,68 €');

    const formattedBillDetails = BillHelper.formatBillDetailsForPdf(bill);

    expect(formattedBillDetails).toEqual({
      formattedDetails: [
        {
          unitInclTaxes: 24.47,
          vat: 5.5,
          name: 'Temps de qualité - autonomie',
          volume: '18,00 h',
          total: 440.46,
        },
        { name: 'Majorations', total: 12.24 },
      ],
      totalExclTaxes: '430,54 €',
      totalVAT: '23,68 €',
    });

    sinon.assert.calledOnceWithExactly(computeSurcharge, bill.subscriptions[0]);
  });

  it('should return formatted details if there are billingItems', () => {
    const bill = {
      _id: new ObjectID(),
      origin: 'compani',
      type: 'manual',
      billingItemList: [
        { name: 'Frais de dossier', unitInclTaxes: 30, count: 1, inclTaxes: 30, exclTaxes: 27.27 },
        {
          name: 'Equipement de protection individuel',
          unitInclTaxes: 2,
          count: 5,
          inclTaxes: 10,
          exclTaxes: 8.33,
        },
      ],
      subscriptions: [],
    };

    formatPrice.onCall(0).returns('35,61 €');
    formatPrice.onCall(1).returns('4,45 €');

    const formattedBillDetails = BillHelper.formatBillDetailsForPdf(bill);

    expect(formattedBillDetails).toEqual({
      formattedDetails: [
        { name: 'Frais de dossier', unitInclTaxes: 30, volume: 1, total: 30 },
        { name: 'Equipement de protection individuel', unitInclTaxes: 2, volume: 5, total: 10 },
      ],
      totalExclTaxes: '35,61 €',
      totalVAT: '4,45 €',
    });
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
      startDate: moment('2019-04-10T08:00:00').toDate(),
      endDate: moment('2019-04-10T10:00:00').toDate(),
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

describe('formatPdf', () => {
  let formatEventsForPdf;
  let formatBillDetailsForPdf;
  let formatIdentity;
  beforeEach(() => {
    formatEventsForPdf = sinon.stub(BillHelper, 'formatEventsForPdf');
    formatBillDetailsForPdf = sinon.stub(BillHelper, 'formatBillDetailsForPdf');
    formatIdentity = sinon.stub(UtilsHelper, 'formatIdentity');
    formatEventsForPdf.returns(['hello']);
  });
  afterEach(() => {
    formatEventsForPdf.restore();
    formatBillDetailsForPdf.restore();
    formatIdentity.restore();
  });

  it('should format correct bill pdf for customer', () => {
    formatBillDetailsForPdf.returns({
      formattedSubs: [{ vat: '5,5' }],
      totalExclTaxes: '1 018,01 €',
      totalVAT: '55,99 €',
    });
    formatIdentity.returns('Maya l\' abeille');

    const company = {
      name: 'Alcatraz',
      logo: 'company_logo',
      rcs: 'rcs',
      address: {
        fullAddress: '37 rue de ponthieu 75008 Paris',
        zipCode: '75008',
        city: 'Paris',
        street: '37 rue de Ponthieu',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
    };

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
        formattedSubs: [{ vat: '5,5' }],
        recipient: { name: 'Maya l\' abeille', address: { fullAddress: 'La ruche' } },
        netInclTaxes: '1 074,00 €',
        date: '30/04/2019',
        totalExclTaxes: '1 018,01 €',
        totalVAT: '55,99 €',
        formattedEvents: ['hello'],
        company,
        forTpp: false,
      },
    };

    const result = BillHelper.formatPdf(bill, company);

    expect(result).toEqual(expectedResult);
    sinon.assert.calledWithExactly(
      formatEventsForPdf,
      bill.subscriptions[0].events,
      bill.subscriptions[0].service
    );
    sinon.assert.calledWithExactly(formatIdentity, bill.customer.identity, 'TFL');
  });

  it('should format correct bill pdf for third party payer', () => {
    formatBillDetailsForPdf.returns({
      formattedSubs: [{ vat: '5,5' }],
      totalExclTaxes: '1 018,01 €',
      totalVAT: '55,99 €',
    });

    const company = {
      name: 'Alcatraz',
      logo: 'company_logo',
      rcs: 'rcs',
      address: {
        fullAddress: '37 rue de ponthieu 75008 Paris',
        zipCode: '75008',
        city: 'Paris',
        street: '37 rue de Ponthieu',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
    };

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
      thirdPartyPayer: {
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
        company,
        forTpp: true,
      },
    };

    const result = BillHelper.formatPdf(bill, company);

    expect(result).toEqual(expected);
    sinon.assert.notCalled(formatIdentity);
  });
});

describe('generateBillPdf', async () => {
  let formatPdf;
  let findOneBill;
  let findOneCompany;
  let generatePdf;
  let getPdfContent;
  beforeEach(() => {
    formatPdf = sinon.stub(BillHelper, 'formatPdf');
    findOneBill = sinon.stub(Bill, 'findOne');
    findOneCompany = sinon.stub(Company, 'findOne');
    generatePdf = sinon.stub(PdfHelper, 'generatePdf');
    getPdfContent = sinon.stub(BillPdf, 'getPdfContent');
  });
  afterEach(() => {
    formatPdf.restore();
    findOneBill.restore();
    findOneCompany.restore();
    generatePdf.restore();
    getPdfContent.restore();
  });

  it('should generate pdf', async () => {
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };
    const bill = { _id: new ObjectID(), number: 'number' };
    findOneBill.returns(SinonMongoose.stubChainedQueries([bill]));
    findOneCompany.returns(SinonMongoose.stubChainedQueries([credentials.company], ['lean']));
    formatPdf.returns({ data: 'data' });
    generatePdf.returns({ pdf: 'pdf' });
    getPdfContent.returns({ content: [{ text: 'data' }] });

    const result = await BillHelper.generateBillPdf({ _id: bill._id }, credentials);

    expect(result).toEqual({ billNumber: bill.number, pdf: { pdf: 'pdf' } });
    sinon.assert.calledWithExactly(formatPdf, bill, credentials.company);
    sinon.assert.calledWithExactly(generatePdf, { content: [{ text: 'data' }] });
    sinon.assert.calledOnceWithExactly(getPdfContent, { data: 'data' });
    SinonMongoose.calledWithExactly(findOneBill, [
      { query: 'findOne', args: [{ _id: bill._id, origin: 'compani' }] },
      { query: 'populate', args: [{ path: 'thirdPartyPayer', select: '_id name address' }] },
      { query: 'populate', args: [{ path: 'customer', select: '_id identity contact fundings' }] },
      { query: 'populate', args: [{ path: 'subscriptions.events.auxiliary', select: 'identity' }] },
      { query: 'lean' },
    ]);
    SinonMongoose.calledWithExactly(findOneCompany, [
      { query: 'findOne', args: [{ _id: companyId }] },
      { query: 'lean' },
    ]);
  });
});
