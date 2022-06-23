const expect = require('expect');
const moment = require('moment');
const sinon = require('sinon');
const { ObjectId } = require('mongodb');
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
const { FIXED } = require('../../../src/helpers/constants');

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
          history: { careHours: '0.5' },
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
          history: { careHours: '2' },
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
        careHours: '0.5',
      },
      {
        eventId: '456',
        startDate: '2019-05-29T08:00:55.374Z',
        endDate: '2019-05-29T10:00:55.374Z',
        auxiliary: '34567890',
        fundingId: 'fundingId',
        inclTaxesTpp: 3,
        exclTaxesTpp: 2,
        careHours: '2',
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
      inclTaxes: 14.40,
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
      inclTaxes: 14.40,
      vat: 12,
      startDate: '2019-06-28T10:06:55.374Z',
      hours: 1.5,
      events: [{ event: 'event' }],
    }));
    sinon.assert.calledWithExactly(getMatchingVersionStub, bill.endDate, bill.subscription.service, 'startDate');
    sinon.assert.calledWithExactly(formatBilledEvents, bill);
  });
});

describe('formatBillingItemData', () => {
  it('should return formatted data for bill with billing item', () => {
    const billingItemId = new ObjectId();
    const eventId = new ObjectId();
    const bill = {
      billingItem: { _id: billingItemId, name: 'skusku' },
      unitInclTaxes: 24.64,
      unitExclTaxes: 22.64,
      exclTaxes: 13.64,
      inclTaxes: 14.40,
      startDate: '2019-06-28T10:06:55.374Z',
      endDate: '2019-06-28T12:06:55.374Z',
      vat: 12,
      eventsList: [{
        event: eventId,
        startDate: '2019-05-28T10:00:55.374Z',
        endDate: '2019-05-28T13:00:55.374Z',
        auxiliary: '34567890',
        inclTaxesCustomer: 12,
        exclTaxesCustomer: 10,
      }],
      discount: 10,
    };

    const result = BillHelper.formatBillingItemData(bill);

    expect(result).toEqual({
      startDate: '2019-06-28T10:06:55.374Z',
      endDate: '2019-06-28T12:06:55.374Z',
      unitInclTaxes: 24.64,
      exclTaxes: 13.64,
      inclTaxes: 14.4,
      vat: 12,
      discount: 10,
      billingItem: billingItemId,
      events: [{
        eventId,
        startDate: '2019-05-28T10:00:55.374Z',
        endDate: '2019-05-28T13:00:55.374Z',
        auxiliary: '34567890',
      }],
      count: 1,
      name: 'skusku',
    });
  });
});

describe('formatCustomerBill', () => {
  let formatBillNumber;
  let formatSubscriptionData;
  let formatBillingItemData;
  beforeEach(() => {
    formatBillNumber = sinon.stub(BillHelper, 'formatBillNumber');
    formatSubscriptionData = sinon.stub(BillHelper, 'formatSubscriptionData');
    formatBillingItemData = sinon.stub(BillHelper, 'formatBillingItemData');
  });
  afterEach(() => {
    formatBillNumber.restore();
    formatSubscriptionData.restore();
    formatBillingItemData.restore();
  });

  it('Case 1 : 1 bill with subscription', () => {
    const company = { prefixNumber: 1234, _id: new ObjectId() };
    const customer = { _id: 'lilalo' };
    const number = { prefix: 'Picsou', seq: 77 };
    const customerBills = {
      shouldBeSent: true,
      bills: [{
        endDate: '2019-09-19T00:00:00',
        subscription: { _id: 'asd', service: { versions: [{ vat: 12, startDate: '2019-05-30T10:00:55.374Z' }] } },
        unitExclTaxes: '24.644549763033176',
        exclTaxes: '13.649289099526067',
        inclTaxes: '14.4',
        startDate: '2019-05-31T10:00:55',
        hours: '1.5',
        eventsList: [
          {
            event: '123',
            startDate: '2019-05-28T10:00:55',
            endDate: '2019-05-28T13:00:55',
            auxiliary: '34567890',
            inclTaxesTpp: '14.4',
          },
          {
            event: '456',
            startDate: '2019-05-29T08:00:55',
            endDate: '2019-05-29T10:00:55',
            auxiliary: '34567890',
            inclTaxesTpp: '12',
          },
        ],
      }],
      total: 14.4,
    };
    formatBillNumber.returns('FACT-1234Picsou00077');
    formatSubscriptionData.returns({ subscriptions: 'subscriptions' });

    const result = BillHelper.formatCustomerBills(customerBills, customer, number, company);

    expect(result).toBeDefined();
    expect(result.bill).toEqual({
      company: company._id,
      customer: 'lilalo',
      number: 'FACT-1234Picsou00077',
      shouldBeSent: true,
      subscriptions: [{ subscriptions: 'subscriptions' }],
      type: 'automatic',
      netInclTaxes: 14.40,
      date: '2019-09-19T00:00:00',
      billingItemList: [],
    });
    expect(result.billedEvents).toBeDefined();
    expect(result.billedEvents).toEqual({
      123: {
        event: '123',
        startDate: '2019-05-28T10:00:55',
        endDate: '2019-05-28T13:00:55',
        auxiliary: '34567890',
        inclTaxesTpp: '14.4',
      },
      456: {
        event: '456',
        startDate: '2019-05-29T08:00:55',
        endDate: '2019-05-29T10:00:55',
        auxiliary: '34567890',
        inclTaxesTpp: '12',
      },
    });
    sinon.assert.calledOnceWithExactly(formatBillNumber, 1234, 'Picsou', 77);
    sinon.assert.calledOnceWithExactly(formatSubscriptionData, customerBills.bills[0]);
    sinon.assert.notCalled(formatBillingItemData);
  });

  it('Case 1bis : 1 bill with billing items', () => {
    const company = { prefixNumber: 1234, _id: new ObjectId() };
    const customer = { _id: 'lilalo' };
    const number = { prefix: 'Picsou', seq: 77 };
    const customerBills = {
      shouldBeSent: true,
      bills: [{
        billingItem: { _id: 'biid', name: 'depl' },
        endDate: '2019-09-19T00:00:00',
        exclTaxes: '13',
        eventsList: [
          { event: '123', startDate: '2019-05-28T10:00:55', endDate: '2019-05-28T13:00:55', auxiliary: '34567890' },
          { event: '456', startDate: '2019-05-29T08:00:55', endDate: '2019-05-29T10:00:55', auxiliary: '34567890' },
        ],
        inclTaxes: '14.4',
        startDate: '2019-05-31T10:00:55',
        unitExclTaxes: '24',
        unitInclTaxes: '30',
      }],
      total: 14.4,
    };
    formatBillNumber.returns('FACT-1234Picsou00077');
    formatBillingItemData.returns({ billingItem: 'billingItem' });

    const result = BillHelper.formatCustomerBills(customerBills, customer, number, company);

    expect(result).toBeDefined();
    expect(result.bill).toEqual({
      company: company._id,
      customer: 'lilalo',
      number: 'FACT-1234Picsou00077',
      shouldBeSent: true,
      subscriptions: [],
      type: 'automatic',
      netInclTaxes: 14.40,
      date: '2019-09-19T00:00:00',
      billingItemList: [{ billingItem: 'billingItem' }],
    });
    expect(result.billedEvents).toEqual({
      123: {
        event: '123',
        billingItems: [{ billingItem: 'biid', inclTaxes: '30', exclTaxes: '24' }],
        exclTaxesCustomer: '24',
        inclTaxesCustomer: '30',
      },
      456: {
        event: '456',
        billingItems: [{ billingItem: 'biid', inclTaxes: '30', exclTaxes: '24' }],
        exclTaxesCustomer: '24',
        inclTaxesCustomer: '30',
      },
    });
    sinon.assert.calledOnceWithExactly(formatBillNumber, 1234, 'Picsou', 77);
    sinon.assert.notCalled(formatSubscriptionData);
    sinon.assert.calledOnceWithExactly(formatBillingItemData, customerBills.bills[0]);
  });

  it('Case 2 : multiple bills', () => {
    const company = { prefixNumber: 1234, _id: new ObjectId() };
    const customer = { _id: 'lilalo' };
    const number = { prefix: 'Picsou', seq: 77 };
    const customerBills = {
      total: 14.4,
      shouldBeSent: false,
      bills: [
        {
          endDate: '2019-09-19T00:00:00',
          subscription: { _id: 'asd', service: { versions: [{ vat: 12, startDate: '2019-05-30T10:00:55.374Z' }] } },
          unitExclTaxes: '24.644549763033176',
          exclTaxes: '13.649289099526067',
          inclTaxes: '14.4',
          hours: '1.5',
          startDate: '2019-05-31T10:00:55.374Z',
          eventsList: [
            {
              event: '123',
              startDate: '2019-05-28T10:00:55.374Z',
              endDate: '2019-05-28T13:00:55.374Z',
              auxiliary: '34567890',
              inclTaxesTpp: '14.4',
            },
            {
              event: '456',
              startDate: '2019-05-29T08:00:55.374Z',
              endDate: '2019-05-29T10:00:55.374Z',
              auxiliary: '34567890',
              inclTaxesTpp: '12',
            },
          ],
        },
        {
          endDate: '2019-09-19T00:00:00',
          subscription: { _id: 'fgh', service: { versions: [{ vat: 34, startDate: '2019-05-30T10:00:55.374Z' }] } },
          unitExclTaxes: '34',
          exclTaxes: '11',
          inclTaxes: '15',
          hours: '5',
          startDate: '2019-05-31T10:00:55.374Z',
          eventsList: [
            {
              event: '890',
              startDate: '2019-05-29T10:00:55.374Z',
              endDate: '2019-05-29T13:00:55.374Z',
              auxiliary: '34567890',
              inclTaxesTpp: '45',
            },
            {
              event: '736',
              startDate: '2019-05-30T08:00:55.374Z',
              endDate: '2019-05-30T10:00:55.374Z',
              auxiliary: '34567890',
              inclTaxesTpp: '23',
            },
          ],
        },
        {
          endDate: '2019-09-19T00:00:00',
          billingItem: { _id: 'billingItemId', name: 'Billing Eilish' },
          unitInclTaxes: '34',
          unitExclTaxes: '32.12',
          exclTaxes: '12',
          inclTaxes: '17',
          vat: 5,
          startDate: '2019-05-31T10:00:55.374Z',
          eventsList: [
            {
              event: '890',
              startDate: '2019-05-29T10:00:55.374Z',
              endDate: '2019-05-29T13:00:55.374Z',
              auxiliary: '34567890',
            },
            {
              event: '736',
              startDate: '2019-05-30T08:00:55.374Z',
              endDate: '2019-05-30T10:00:55.374Z',
              auxiliary: '34567890',
            },
          ],
        },
        {
          endDate: '2019-09-19T00:00:00',
          billingItem: { _id: 'billingItemId2', name: 'Billing Eilish' },
          unitInclTaxes: '20',
          unitExclTaxes: '10',
          exclTaxes: '12',
          inclTaxes: '17',
          vat: 5,
          startDate: '2019-05-31T10:00:55.374Z',
          eventsList: [
            {
              event: '736',
              startDate: '2019-05-30T08:00:55.374Z',
              endDate: '2019-05-30T10:00:55.374Z',
              auxiliary: '34567890',
            },
          ],
        },
      ],
    };
    formatBillNumber.returns('FACT-1234Picsou00077');
    formatSubscriptionData.returns({ subscriptions: 'subscriptions' });
    formatBillingItemData.onCall(0).returns({ billingItem: 'billingItemId' });
    formatBillingItemData.onCall(1).returns({ billingItem: 'billingItemId2' });

    const result = BillHelper.formatCustomerBills(customerBills, customer, number, company);

    expect(result).toBeDefined();
    expect(result.bill).toBeDefined();
    expect(result.bill).toEqual({
      company: company._id,
      customer: 'lilalo',
      number: 'FACT-1234Picsou00077',
      shouldBeSent: false,
      date: '2019-09-19T00:00:00',
      netInclTaxes: 14.40,
      subscriptions: [{ subscriptions: 'subscriptions' }, { subscriptions: 'subscriptions' }],
      billingItemList: [{ billingItem: 'billingItemId' }, { billingItem: 'billingItemId2' }],
      type: 'automatic',
    });
    expect(result.billedEvents).toBeDefined();
    expect(result.billedEvents).toEqual({
      123: {
        auxiliary: '34567890',
        endDate: '2019-05-28T13:00:55.374Z',
        event: '123',
        inclTaxesTpp: '14.4',
        startDate: '2019-05-28T10:00:55.374Z',
      },
      456: {
        auxiliary: '34567890',
        endDate: '2019-05-29T10:00:55.374Z',
        event: '456',
        inclTaxesTpp: '12',
        startDate: '2019-05-29T08:00:55.374Z',
      },
      736: {
        auxiliary: '34567890',
        billingItems: [
          { billingItem: 'billingItemId', exclTaxes: '32.12', inclTaxes: '34' },
          { billingItem: 'billingItemId2', exclTaxes: '10', inclTaxes: '20' },
        ],
        endDate: '2019-05-30T10:00:55.374Z',
        event: '736',
        exclTaxesCustomer: '42.12',
        inclTaxesCustomer: '54',
        inclTaxesTpp: '23',
        startDate: '2019-05-30T08:00:55.374Z',
      },
      890: {
        auxiliary: '34567890',
        billingItems: [{ billingItem: 'billingItemId', exclTaxes: '32.12', inclTaxes: '34' }],
        endDate: '2019-05-29T13:00:55.374Z',
        event: '890',
        exclTaxesCustomer: '32.12',
        inclTaxesCustomer: '34',
        inclTaxesTpp: '45',
        startDate: '2019-05-29T10:00:55.374Z',
      },
    });
    sinon.assert.calledWithExactly(formatBillNumber, 1234, 'Picsou', 77);
    sinon.assert.calledWithExactly(formatSubscriptionData.getCall(0), customerBills.bills[0]);
    sinon.assert.calledWithExactly(formatSubscriptionData.getCall(1), customerBills.bills[1]);
    sinon.assert.calledWithExactly(formatBillingItemData.getCall(0), customerBills.bills[2]);
    sinon.assert.calledWithExactly(formatBillingItemData.getCall(1), customerBills.bills[3]);
  });
});

describe('formatThirdPartyPayerBills', () => {
  let formatBillNumber;
  let formatSubscriptionData;
  beforeEach(() => {
    formatBillNumber = sinon.stub(BillHelper, 'formatBillNumber');
    formatSubscriptionData = sinon.stub(BillHelper, 'formatSubscriptionData');
  });
  afterEach(() => {
    formatBillNumber.restore();
    formatSubscriptionData.restore();
  });

  it('Case 1 : 1 third party payer - 1 bill - Funding monthly and hourly', () => {
    const company = { prefixNumber: 1234, _id: new ObjectId() };
    const customer = { _id: 'lilalo' };
    const number = { prefix: 'Picsou', seq: 77 };
    const thirdPartyPayerBills = [{
      total: 14.4,
      bills: [{
        endDate: '2019-09-19T00:00:00',
        thirdPartyPayer: { _id: 'Papa' },
        subscription: { _id: 'asd', service: { versions: [{ vat: 12, startDate: moment().toISOString() }] } },
        unitExclTaxes: '24.644549763033176',
        startDate: moment().add(1, 'd').toISOString(),
        exclTaxes: '13.649289099526067',
        inclTaxes: '14.4',
        hours: '1.5',
        eventsList: [
          {
            event: '123',
            inclTaxesTpp: '14.4',
            startDate: '2019-02-15T08:00:55.374Z',
            endDate: '2019-02-15T10:00:55.374Z',
            auxiliary: '34567890',
            history: { fundingId: 'fund', careHours: 4, month: '02/2019', nature: 'hourly' },
          },
          {
            event: '456',
            inclTaxesTpp: '12',
            startDate: '2019-02-16T08:00:55.374Z',
            endDate: '2019-02-16T10:00:55.374Z',
            auxiliary: '34567890',
            history: { fundingId: 'fund', careHours: 2, month: '03/2019', nature: 'hourly' },
          },
        ],
      }],
    }];
    formatBillNumber.returns('FACT-1234Picsou00077');
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
      123: { event: '123', inclTaxesTpp: '14.4' },
      456: { event: '456', inclTaxesTpp: '12' },
    });
    expect(result.fundingHistories).toBeDefined();
    expect(result.fundingHistories).toMatchObject({
      fund: {
        '02/2019': { careHours: 4, fundingId: 'fund', month: '02/2019', nature: 'hourly' },
        '03/2019': { careHours: 2, fundingId: 'fund', month: '03/2019', nature: 'hourly' },
      },
    });
    sinon.assert.calledWithExactly(formatBillNumber, 1234, 'Picsou', 77);
    sinon.assert.calledWithExactly(formatSubscriptionData, thirdPartyPayerBills[0].bills[0]);
  });
  it('Case 2 : 1 third party payer - 1 bill - Funding once and hourly', () => {
    const company = { prefixNumber: 1234, _id: new ObjectId() };
    const customer = { _id: 'lilalo' };
    const number = { prefix: 'Picsou', seq: 77 };
    const thirdPartyPayerBills = [{
      total: 14.4,
      bills: [{
        endDate: '2019-09-19T00:00:00',
        thirdPartyPayer: { _id: 'Papa' },
        subscription: { _id: 'asd', service: { versions: [{ vat: 12, startDate: moment().toISOString() }] } },
        unitExclTaxes: '24.644549763033176',
        startDate: moment().add(1, 'd').toISOString(),
        exclTaxes: '13.649289099526067',
        inclTaxes: '14.4',
        hours: '1.5',
        eventsList: [
          {
            event: '123',
            inclTaxesTpp: '14.4',
            startDate: '2019-02-15T08:00:55.374Z',
            endDate: '2019-02-15T10:00:55.374Z',
            auxiliary: '34567890',
            history: { fundingId: 'fund', careHours: '4', nature: 'hourly' },
          },
          {
            event: '456',
            inclTaxesTpp: '12',
            startDate: '2019-02-16T08:00:55.374Z',
            endDate: '2019-02-16T10:00:55.374Z',
            auxiliary: '34567890',
            history: { fundingId: 'fund', careHours: '2', nature: 'hourly' },
          },
        ],
      }],
    }];
    formatBillNumber.returns('FACT-1234Picsou00077');
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
      123: { event: '123', inclTaxesTpp: '14.4' },
      456: { event: '456', inclTaxesTpp: '12' },
    });
    expect(result.fundingHistories).toBeDefined();
    expect(result.fundingHistories).toMatchObject({
      fund: { careHours: '6', fundingId: 'fund', nature: 'hourly' },
    });
    sinon.assert.calledWithExactly(formatBillNumber, 1234, 'Picsou', 77);
    sinon.assert.calledWithExactly(formatSubscriptionData, thirdPartyPayerBills[0].bills[0]);
  });
  it('Case 3 : 1 third party payer - 1 bill - Funding once and fixed', () => {
    const company = { prefixNumber: 1234, _id: new ObjectId() };
    const customer = { _id: 'lilalo' };
    const number = { prefix: 'Picsou', seq: 77 };
    const thirdPartyPayerBills = [{
      total: 14.4,
      bills: [{
        endDate: '2019-09-19T00:00:00',
        thirdPartyPayer: { _id: 'Papa' },
        subscription: { _id: 'asd', service: { versions: [{ vat: 12, startDate: moment().toISOString() }] } },
        unitExclTaxes: '24.644549763033176',
        startDate: moment().add(1, 'd').toISOString(),
        exclTaxes: '13.649289099526067',
        inclTaxes: '14.4',
        hours: '1.5',
        eventsList: [
          {
            event: '123',
            inclTaxesTpp: '14.4',
            auxiliary: '34567890',
            startDate: '2019-02-15T08:00:55.374Z',
            endDate: '2019-02-15T10:00:55.374Z',
            history: { fundingId: 'fund', amountTTC: '40', nature: 'fixed' },
          },
          {
            event: '456',
            inclTaxesTpp: '12',
            auxiliary: '34567890',
            startDate: '2019-02-16T08:00:55.374Z',
            endDate: '2019-02-16T10:00:55.374Z',
            history: { fundingId: 'fund', amountTTC: '20', nature: 'fixed' },
          },
        ],
      }],
    }];
    formatBillNumber.returns('FACT-1234Picsou00077');
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
      123: { event: '123', inclTaxesTpp: '14.4' },
      456: { event: '456', inclTaxesTpp: '12' },
    });
    expect(result.fundingHistories).toBeDefined();
    expect(result.fundingHistories).toMatchObject({
      fund: { amountTTC: '60', fundingId: 'fund', nature: 'fixed' },
    });
    sinon.assert.calledWithExactly(formatBillNumber, 1234, 'Picsou', 77);
    sinon.assert.calledWithExactly(formatSubscriptionData, thirdPartyPayerBills[0].bills[0]);
  });
  it('Case 4 : 1 third party payer - multiple bills', () => {
    const company = { _id: new ObjectId(), prefixNumber: 1234 };
    const customer = { _id: 'lilalo' };
    const number = { prefix: 'Picsou', seq: 77 };
    const thirdPartyPayerBills = [{
      total: 14.4,
      bills: [{
        endDate: '2019-09-19T00:00:00',
        thirdPartyPayer: { _id: 'Papa' },
        subscription: { _id: 'asd', service: { versions: [{ vat: 12, startDate: moment().toISOString() }] } },
        unitExclTaxes: '24.644549763033176',
        exclTaxes: '13.649289099526067',
        startDate: moment().add(1, 'd').toISOString(),
        inclTaxes: '14.4',
        hours: '1.5',
        eventsList: [
          {
            event: '123',
            auxiliary: '34567890',
            startDate: '2019-02-15T08:00:55.374Z',
            endDate: '2019-02-15T10:00:55.374Z',
            inclTaxesTpp: '14.4',
            history: { fundingId: 'fund', careHours: '2', month: '02/2019', nature: 'hourly' },
          },
          {
            event: '456',
            auxiliary: '34567890',
            startDate: '2019-02-16T08:00:55.374Z',
            endDate: '2019-02-16T10:00:55.374Z',
            inclTaxesTpp: '12',
            history: { fundingId: 'lio', careHours: '4', month: '02/2019', nature: 'hourly' },
          },
        ],
      }, {
        thirdPartyPayer: { _id: 'Papa' },
        subscription: { _id: 'fgh', service: { versions: [{ vat: 5.5, startDate: moment().toISOString() }] } },
        unitExclTaxes: '34',
        exclTaxes: '15',
        startDate: moment().add(1, 'd').toISOString(),
        inclTaxes: '11',
        hours: '5',
        eventsList: [
          {
            event: '890',
            auxiliary: '34567890',
            startDate: '2019-02-17T08:00:55.374Z',
            endDate: '2019-02-17T10:00:55.374Z',
            inclTaxesTpp: '45',
            history: { fundingId: 'fund', careHours: '4.5', month: '02/2019', nature: 'hourly' },
          },
          {
            event: '736',
            auxiliary: '34567890',
            startDate: '2019-02-18T08:00:55.374Z',
            endDate: '2019-02-18T10:00:55.374Z',
            inclTaxesTpp: '23',
            history: { fundingId: 'fund', careHours: '1', month: '03/2019', nature: 'hourly' },
          },
        ],
      }],
    }];
    formatBillNumber.returns('FACT-1234Picsou00077');
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
      123: { event: '123', inclTaxesTpp: '14.4' },
      456: { event: '456', inclTaxesTpp: '12' },
      890: { event: '890', inclTaxesTpp: '45' },
      736: { event: '736', inclTaxesTpp: '23' },
    });
    expect(result.fundingHistories).toBeDefined();
    expect(result.fundingHistories).toMatchObject({
      fund: {
        '02/2019': { careHours: '6.5', fundingId: 'fund', month: '02/2019', nature: 'hourly' },
        '03/2019': { careHours: '1', fundingId: 'fund', month: '03/2019', nature: 'hourly' },
      },
      lio: { '02/2019': { careHours: '4', fundingId: 'lio', month: '02/2019', nature: 'hourly' } },
    });
    sinon.assert.calledWithExactly(formatBillNumber, 1234, 'Picsou', 77);
    sinon.assert.calledWithExactly(formatSubscriptionData.getCall(0), thirdPartyPayerBills[0].bills[0]);
    sinon.assert.calledWithExactly(formatSubscriptionData.getCall(1), thirdPartyPayerBills[0].bills[1]);
  });
  it('Case 5 : multiple third party payers', () => {
    const company = { _id: new ObjectId(), prefixNumber: 1234 };
    const customer = { _id: 'lilalo' };
    const number = { prefix: 'Picsou', seq: 77 };
    const thirdPartyPayerBills = [{
      total: 14.4,
      bills: [{
        endDate: '2019-09-19T00:00:00',
        thirdPartyPayer: { _id: 'Papa' },
        subscription: { _id: 'asd', service: { versions: [{ vat: 12, startDate: moment().toISOString() }] } },
        unitExclTaxes: '24.644549763033176',
        exclTaxes: '13.649289099526067',
        startDate: moment().add(1, 'd').toISOString(),
        inclTaxes: '14.4',
        hours: '1.5',
        eventsList: [
          { event: '123', inclTaxesTpp: '14.4', history: { fundingId: 'fund', careHours: '2' } },
          { event: '456', inclTaxesTpp: '12', history: { fundingId: 'lio', careHours: '4' } },
        ],
      }],
    }, {
      total: 14.4,
      bills: [{
        thirdPartyPayer: { _id: 'Papa' },
        subscription: { _id: 'fgh', service: { versions: [{ vat: 12, startDate: moment().toISOString() }] } },
        unitExclTaxes: '34',
        startDate: moment().add(1, 'd').toISOString(),
        exclTaxes: '15',
        inclTaxes: '11',
        hours: '5',
        eventsList: [
          { event: '890', inclTaxesTpp: '45', history: { fundingId: 'fund', careHours: '4.5' } },
          { event: '736', inclTaxesTpp: '23', history: { fundingId: 'fund', careHours: '1' } },
        ],
      }],
    }];
    formatBillNumber.returns('FACT-1234Picsou00077');
    formatSubscriptionData.returns({ subscriptions: 'subscriptions' });

    const result = BillHelper.formatThirdPartyPayerBills(thirdPartyPayerBills, customer, number, company);
    expect(result).toBeDefined();
    expect(result.tppBills).toBeDefined();
    expect(result.tppBills.length).toEqual(2);
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
    const eventId = (new ObjectId()).toHexString();
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
  let findOne;
  let updateOne;
  beforeEach(() => {
    findOne = sinon.stub(FundingHistory, 'findOne');
    updateOne = sinon.stub(FundingHistory, 'updateOne');
  });
  afterEach(() => {
    findOne.restore();
    updateOne.restore();
  });

  it('should not update history as list is empty', async () => {
    const companyId = new ObjectId();
    await BillHelper.updateFundingHistories([], companyId);

    sinon.assert.notCalled(findOne);
    sinon.assert.notCalled(updateOne);
  });
  it('should update history of fixed funding', async () => {
    const companyId = new ObjectId();
    const fundingId = new ObjectId();
    const histories = { [fundingId.toHexString()]: { amountTTC: '12' } };
    findOne.returns(SinonMongoose.stubChainedQueries({ _id: fundingId, careHours: '0', amountTTC: '2.34' }, ['lean']));

    await BillHelper.updateFundingHistories(histories, companyId);

    SinonMongoose.calledOnceWithExactly(
      findOne,
      [
        {
          query: 'findOne',
          args: [{ fundingId: fundingId.toHexString(), company: companyId }, { amountTTC: 1, careHours: 1 }],
        },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledWithExactly(
      updateOne,
      { fundingId: fundingId.toHexString(), company: companyId },
      { $set: { amountTTC: '14.34' } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  });
  it('should update history of hourly and monthly funding', async () => {
    const companyId = new ObjectId();
    const fundingId = new ObjectId();
    const histories = { [fundingId]: { 11: { careHours: '12' }, 12: { careHours: '18' } } };
    findOne.onCall(0).returns(SinonMongoose.stubChainedQueries(
      { _id: fundingId, careHours: '4.33', amountTTC: '0' },
      ['lean']
    ));
    findOne.onCall(1).returns(SinonMongoose.stubChainedQueries(
      { _id: fundingId, careHours: '4.33', amountTTC: '0', month: '11' },
      ['lean']
    ));
    findOne.onCall(2).returns(SinonMongoose.stubChainedQueries(
      { _id: fundingId, careHours: '142', amountTTC: '0', month: '12' },
      ['lean']
    ));

    await BillHelper.updateFundingHistories(histories, companyId);

    SinonMongoose.calledWithExactly(
      findOne,
      [
        {
          query: 'findOne',
          args: [{ fundingId: fundingId.toHexString(), company: companyId }, { amountTTC: 1, careHours: 1 }],
        },
        { query: 'lean' },
      ],
      0
    );
    SinonMongoose.calledWithExactly(
      findOne,
      [
        {
          query: 'findOne',
          args: [
            { fundingId: fundingId.toHexString(), company: companyId, month: '11' },
            { amountTTC: 1, careHours: 1 },
          ],
        },
        { query: 'lean' },
      ],
      1
    );
    SinonMongoose.calledWithExactly(
      findOne,
      [
        {
          query: 'findOne',
          args: [
            { fundingId: fundingId.toHexString(), company: companyId, month: '12' },
            { amountTTC: 1, careHours: 1 },
          ],
        },
        { query: 'lean' },
      ],
      2
    );
    sinon.assert.calledWithExactly(
      updateOne.getCall(0),
      { fundingId: fundingId.toHexString(), company: companyId, month: '11' },
      { $set: { careHours: '16.33' } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    sinon.assert.calledWithExactly(
      updateOne.getCall(1),
      { fundingId: fundingId.toHexString(), company: companyId, month: '12' },
      { $set: { careHours: '160' } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  });
  it('should update list of histories', async () => {
    const companyId = new ObjectId();
    const histories = {
      1: { careHours: '12' },
      2: { amountTTC: '12' },
      3: { 11: { careHours: '12' }, 12: { careHours: '59.33' } },
    };

    findOne.onCall(0).returns(
      SinonMongoose.stubChainedQueries({ _id: '1', careHours: '14', amountTTC: '0' }, ['lean'])
    );
    findOne.onCall(1).returns(
      SinonMongoose.stubChainedQueries({ _id: '2', careHours: '0', amountTTC: '135.67' }, ['lean'])
    );
    findOne.onCall(2).returns(
      SinonMongoose.stubChainedQueries({ _id: '3', careHours: '68', amountTTC: '0' }, ['lean'])
    );
    findOne.onCall(3).returns(
      SinonMongoose.stubChainedQueries({ _id: '3', careHours: '68', amountTTC: '0', month: '11' }, ['lean'])
    );
    findOne.onCall(4).returns(
      SinonMongoose.stubChainedQueries({ _id: '3', careHours: '40.67', amountTTC: '0', month: '12' }, ['lean'])
    );

    await BillHelper.updateFundingHistories(histories, companyId);

    SinonMongoose.calledWithExactly(
      findOne,
      [
        {
          query: 'findOne',
          args: [{ fundingId: '1', company: companyId }, { amountTTC: 1, careHours: 1 }],
        },
        { query: 'lean' },
      ],
      0
    );
    SinonMongoose.calledWithExactly(
      findOne,
      [
        {
          query: 'findOne',
          args: [{ fundingId: '2', company: companyId }, { amountTTC: 1, careHours: 1 }],
        },
        { query: 'lean' },
      ],
      1
    );
    SinonMongoose.calledWithExactly(
      findOne,
      [
        {
          query: 'findOne',
          args: [
            { fundingId: '3', company: companyId },
            { amountTTC: 1, careHours: 1 },
          ],
        },
        { query: 'lean' },
      ],
      2
    );
    SinonMongoose.calledWithExactly(
      findOne,
      [
        {
          query: 'findOne',
          args: [
            { fundingId: '3', company: companyId, month: '11' },
            { amountTTC: 1, careHours: 1 },
          ],
        },
        { query: 'lean' },
      ],
      3
    );
    SinonMongoose.calledWithExactly(
      findOne,
      [
        {
          query: 'findOne',
          args: [
            { fundingId: '3', company: companyId, month: '12' },
            { amountTTC: 1, careHours: 1 },
          ],
        },
        { query: 'lean' },
      ],
      4
    );
    sinon.assert.callCount(updateOne, 4);
    sinon.assert.calledWithExactly(
      updateOne.getCall(0),
      { fundingId: '1', company: companyId },
      { $set: { careHours: '26' } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    sinon.assert.calledWithExactly(
      updateOne.getCall(1),
      { fundingId: '2', company: companyId },
      { $set: { amountTTC: '147.67' } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    sinon.assert.calledWithExactly(
      updateOne.getCall(2),
      { fundingId: '3', company: companyId, month: '11' },
      { $set: { careHours: '80' } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    sinon.assert.calledWithExactly(
      updateOne.getCall(3),
      { fundingId: '3', company: companyId, month: '12' },
      { $set: { careHours: '100' } },
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
    const companyId = new ObjectId();
    const prefix = '1119';
    const billNumber = { prefix, seq: 1 };

    findOneAndUpdateBillNumber.returns(SinonMongoose.stubChainedQueries(billNumber, ['lean']));

    const result = await BillHelper.getBillNumber(new Date('2019-11-15'), companyId);
    expect(result).toEqual(billNumber);
    SinonMongoose.calledOnceWithExactly(findOneAndUpdateBillNumber, [
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
    const companyId = new ObjectId();
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
      billedEvents: customerBilledEvents,
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
      billedEvents: tppBilledEvents,
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
      { prefix: number.prefix, company: credentials.company._id },
      { $set: { seq: 3 } }
    );
    sinon.assert.calledOnceWithExactly(
      updateManyCreditNote,
      { events: { $elemMatch: { eventId: { $in: Object.keys(eventsToUpdate) } } } },
      { isEditable: false }
    );
    sinon.assert.calledOnceWithExactly(insertManyBill, [customerBillingInfo.bill, ...tppBillingInfo.tppBills]);
  });

  it('should create a customer bill with billingItem and a third party payer bills', async () => {
    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId } };
    const customerId = new ObjectId();
    const subscriptionId = new ObjectId();
    const billingItemId = new ObjectId();
    const tppId = new ObjectId();
    const auxiliaryId = new ObjectId();
    const groupByCustomerBills = [{
      customer: { _id: customerId, identity: { title: 'mrs', lastname: 'Test', firstname: 'Aman' } },
      endDate: '2021-09-30T21:59:59.999Z',
      customerBills: {
        total: 409.2,
        bills: [{ subscription: { _id: subscriptionId } }, { billingItem: { _id: billingItemId } }],
      },
      thirdPartyPayerBills: [[{ subscription: { _id: subscriptionId }, thirdPartyPayer: { _id: tppId } }]],
    }];
    const customerBillingInfo = {
      bill: { customer: customerId, billingItemList: [{ _id: billingItemId }] },
      billedEvents: {
        123: {
          event: '123',
          startDate: '2021-09-16T18:00:00.000Z',
          endDate: '2021-09-16T20:00:00.000Z',
          auxiliary: auxiliaryId,
          inclTaxesCustomer: 304.6,
          exclTaxesCustomer: 280,
          inclTaxesTpp: 20.4,
          exclTaxesTpp: 19.33649289099526,
          thirdPartyPayer: tppId,
          billingItems: [{ _id: billingItemId }],
        },
        456: {
          event: '456',
          startDate: '2021-09-17T18:00:00.000Z',
          endDate: '2021-09-17T20:00:00.000Z',
          auxiliary: auxiliaryId,
          inclTaxesCustomer: 304.6,
          exclTaxesCustomer: 280,
          billingItems: [{ _id: billingItemId }],
        },
      },
    };
    const tppBillingInfo = {
      tppBills: [{ customer: customerId, thirdPartyPayer: tppId }],
      billedEvents: {
        123: {
          event: '123',
          startDate: '2021-09-16T18:00:00.000Z',
          endDate: '2021-09-16T20:00:00.000Z',
          auxiliary: auxiliaryId,
          inclTaxesTpp: 20.4,
          exclTaxesTpp: 19.33649289099526,
          thirdPartyPayer: tppId,
          inclTaxesCustomer: 204.6,
          exclTaxesCustomer: 180,
          nature: 'hourly',
          careHours: 2,
        },
      },
    };
    const number = { prefix: 'FACT-1911', seq: 1 };

    getBillNumberStub.returns(number);
    formatCustomerBillsStub.returns(customerBillingInfo);
    formatThirdPartyPayerBillsStub.returns(tppBillingInfo);

    await BillHelper.formatAndCreateList(groupByCustomerBills, credentials);

    sinon.assert.calledWithExactly(
      updateEventsStub,
      {
        123: {
          event: '123',
          startDate: '2021-09-16T18:00:00.000Z',
          endDate: '2021-09-16T20:00:00.000Z',
          auxiliary: auxiliaryId,
          inclTaxesTpp: 20.4,
          exclTaxesTpp: 19.33649289099526,
          thirdPartyPayer: tppId,
          inclTaxesCustomer: 304.6,
          exclTaxesCustomer: 280,
          nature: 'hourly',
          billingItems: [{ _id: billingItemId }],
          careHours: 2,
        },
        456: {
          event: '456',
          startDate: '2021-09-17T18:00:00.000Z',
          endDate: '2021-09-17T20:00:00.000Z',
          auxiliary: auxiliaryId,
          inclTaxesCustomer: 304.6,
          exclTaxesCustomer: 280,
          billingItems: [{ _id: billingItemId }],
        },
      }
    );
  });

  it('should create customer bill', async () => {
    const companyId = new ObjectId();
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
      billedEvents: customerBilledEvents,
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
      { prefix: number.prefix, company: credentials.company._id },
      { $set: { seq: 2 } }
    );
    sinon.assert.calledOnceWithExactly(
      updateManyCreditNote,
      { events: { $elemMatch: { eventId: { $in: Object.keys({ ...customerBillingInfo.billedEvents }) } } } },
      { isEditable: false }
    );
    sinon.assert.calledOnceWithExactly(insertManyBill, [customerBillingInfo.bill]);
  });

  it('should create third party payer bill', async () => {
    const companyId = new ObjectId();
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
      billedEvents: tppBilledEvents,
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
      { prefix: number.prefix, company: credentials.company._id },
      { $set: { seq: 2 } }
    );
    sinon.assert.calledOnceWithExactly(
      updateManyCreditNote,
      { events: { $elemMatch: { eventId: { $in: Object.keys({ ...tppBillingInfo.billedEvents }) } } } },
      { isEditable: false }
    );
    sinon.assert.calledOnceWithExactly(insertManyBill, tppBillingInfo.tppBills);
  });

  describe('Functions not called', () => {
    const companyId = new ObjectId();
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
      billedEvents: customerBilledEvents,
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
      billedEvents: tppBilledEvents,
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
          { prefix: number.prefix, company: companyId },
          { $set: { seq: number.seq } }
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
          { prefix: number.prefix, company: companyId },
          { $set: { seq: number.seq } }
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
    const authCompanyId = new ObjectId();
    const query = { type: 'manual' };
    const credentials = { company: authCompanyId };
    const bills = [
      { _id: new ObjectId(), type: 'manual', billingItemList: [] },
      { _id: new ObjectId(), type: 'manual', billingItemList: [] },
    ];

    findBill.returns(SinonMongoose.stubChainedQueries(bills));

    await BillHelper.list(query, credentials);

    SinonMongoose.calledOnceWithExactly(
      findBill,
      [
        { query: 'find', args: [{ type: 'manual', company: authCompanyId }] },
        { query: 'populate', args: [{ path: 'customer', select: 'identity' }] },
        { query: 'populate', args: [{ path: 'billingItemList', populate: { path: 'billingItem', select: 'name' } }] },
        { query: 'populate', args: [{ path: 'thirdPartyPayer', select: 'name' }] },
        { query: 'lean' },
      ]
    );
  });

  it('should get a list of automatic bills', async () => {
    const authCompanyId = new ObjectId();
    const query = { type: 'automatic' };
    const credentials = { company: authCompanyId };
    const bills = [
      { _id: new ObjectId(), type: 'automatic', netInclTaxes: 125.98, date: '2022-07-01T10:00:00.000Z' },
      { _id: new ObjectId(), type: 'manual', billingItemList: [] },
    ];

    findBill.returns(SinonMongoose.stubChainedQueries(bills[0]));

    await BillHelper.list(query, credentials);

    SinonMongoose.calledOnceWithExactly(
      findBill,
      [
        { query: 'find', args: [{ type: 'automatic', company: authCompanyId }] },
        { query: 'populate', args: [{ path: 'customer', select: 'identity' }] },
        { query: 'populate', args: [{ path: 'billingItemList', populate: { path: 'billingItem', select: 'name' } }] },
        { query: 'populate', args: [{ path: 'thirdPartyPayer', select: 'name' }] },
        { query: 'lean' },
      ]
    );
  });

  it('should get a list of automatic bills between two dates', async () => {
    const authCompanyId = new ObjectId();
    const query = { type: 'automatic', startDate: '2022-07-01T10:00:00.000Z', endDate: '2022-07-07T10:00:00.000Z' };
    const credentials = { company: authCompanyId };
    const bills = [
      { _id: new ObjectId(), type: 'automatic', netInclTaxes: 125.98, date: '2022-07-01T10:00:00.000Z' },
      { _id: new ObjectId(), type: 'automatic', netInclTaxes: 134, date: '2022-06-01T10:00:00.000Z' },
      { _id: new ObjectId(), type: 'automatic', netInclTaxes: 134, date: '2022-07-06T10:00:00.000Z' },
      { _id: new ObjectId(), type: 'manual', billingItemList: [] },
    ];

    findBill.returns(SinonMongoose.stubChainedQueries([bills[0], bills[3]]));

    await BillHelper.list(query, credentials);

    SinonMongoose.calledOnceWithExactly(
      findBill,
      [
        {
          query: 'find',
          args: [{ type: 'automatic', date: { $gte: query.startDate, $lte: query.endDate }, company: authCompanyId }],
        },
        { query: 'populate', args: [{ path: 'customer', select: 'identity' }] },
        { query: 'populate', args: [{ path: 'billingItemList', populate: { path: 'billingItem', select: 'name' } }] },
        { query: 'populate', args: [{ path: 'thirdPartyPayer', select: 'name' }] },
        { query: 'lean' },
      ]
    );
  });
});

describe('formatBillingItem', () => {
  it('should format billing item', () => {
    const billingItemId = new ObjectId();
    const billingItem = { billingItem: billingItemId, count: 3, unitInclTaxes: 60 };
    const billingItemList = [
      { _id: billingItemId, name: 'bonjour', vat: 20 },
      { _id: new ObjectId(), name: 'au revoir', vat: 40 },
    ];

    const result = BillHelper.formatBillingItem(billingItem, billingItemList);

    expect(result).toEqual({
      billingItem: billingItemId,
      name: 'bonjour',
      unitInclTaxes: 60,
      count: 3,
      inclTaxes: 180,
      exclTaxes: '150',
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

  it('should format and create a bill and send an email to helper', async () => {
    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId, prefixNumber: '101' } };
    const billingItemId1 = new ObjectId();
    const billingItemId2 = new ObjectId();
    const payload = {
      customer: new ObjectId(),
      date: '2021-09-01',
      shouldBeSent: true,
      billingItemList: [
        { billingItem: billingItemId1, unitInclTaxes: 10, count: 2 },
        { billingItem: billingItemId2, unitInclTaxes: 30, count: 1 },
      ],
    };

    getBillNumber.returns({ prefix: 'FACT-101', seq: 1 });
    formatBillNumber.returns('FACT-101092100001');
    findBillingItem.returns(
      SinonMongoose.stubChainedQueries([{ _id: billingItemId1, vat: 10 }, { _id: billingItemId2, vat: 25 }], ['lean'])
    );
    formatBillingItem.onCall(0).returns({ inclTaxes: '180' });
    formatBillingItem.onCall(1).returns({ inclTaxes: '150' });

    await BillHelper.formatAndCreateBill(payload, credentials);

    sinon.assert.calledOnceWithExactly(getBillNumber, '2021-09-01', companyId);
    sinon.assert.calledOnceWithExactly(formatBillNumber, '101', 'FACT-101', 1);
    SinonMongoose.calledOnceWithExactly(
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
        shouldBeSent: true,
      }
    );
  });

  it('should format and create a bill and not send an email to helper', async () => {
    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId, prefixNumber: '101' } };
    const billingItemId1 = new ObjectId();
    const billingItemId2 = new ObjectId();
    const payload = {
      customer: new ObjectId(),
      date: '2021-09-01',
      shouldBeSent: false,
      billingItemList: [
        { billingItem: billingItemId1, unitInclTaxes: 10, count: 2 },
        { billingItem: billingItemId2, unitInclTaxes: 30, count: 1 },
      ],
    };

    getBillNumber.returns({ prefix: 'FACT-101', seq: 1 });
    formatBillNumber.returns('FACT-101092100001');
    findBillingItem.returns(
      SinonMongoose.stubChainedQueries([{ _id: billingItemId1, vat: 10 }, { _id: billingItemId2, vat: 25 }], ['lean'])
    );
    formatBillingItem.onCall(0).returns({ inclTaxes: 180 });
    formatBillingItem.onCall(1).returns({ inclTaxes: 150 });

    await BillHelper.formatAndCreateBill(payload, credentials);

    sinon.assert.calledOnceWithExactly(getBillNumber, '2021-09-01', companyId);
    sinon.assert.calledOnceWithExactly(formatBillNumber, '101', 'FACT-101', 1);
    SinonMongoose.calledOnceWithExactly(
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
        billingItemList: [{ inclTaxes: '180' }, { inclTaxes: '150' }],
        company: companyId,
        shouldBeSent: false,
      }
    );
  });
});

describe('getBills', () => {
  let findBill;
  let getDateQueryStub;
  const credentials = { company: { _id: new ObjectId() } };
  const bills = [{ _id: new ObjectId() }, { _id: new ObjectId() }];

  beforeEach(() => {
    findBill = sinon.stub(Bill, 'find');
    getDateQueryStub = sinon.stub(UtilsHelper, 'getDateQuery');
  });

  afterEach(() => {
    findBill.restore();
    getDateQueryStub.restore();
  });

  it('should return bills', async () => {
    findBill.returns(SinonMongoose.stubChainedQueries(bills));

    const result = await BillHelper.getBills({}, credentials);

    expect(result).toEqual(bills);
    sinon.assert.notCalled(getDateQueryStub);
    SinonMongoose.calledOnceWithExactly(findBill, [
      { query: 'find', args: [{ company: credentials.company._id }] },
      { query: 'populate', args: [{ path: 'thirdPartyPayer', select: '_id name' }] },
      { query: 'lean' },
    ]);
  });

  it('should return bills at specified start date', async () => {
    const query = { startDate: new Date('2019-11-01') };
    const dateQuery = { $lte: query.startDate };

    getDateQueryStub.returns(dateQuery);
    findBill.returns(SinonMongoose.stubChainedQueries(bills));

    const result = await BillHelper.getBills(query, credentials);

    expect(result).toEqual(bills);
    SinonMongoose.calledOnceWithExactly(findBill, [
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
    findBill.returns(SinonMongoose.stubChainedQueries(bills));

    const result = await BillHelper.getBills(query, credentials);

    expect(result).toEqual(bills);
    SinonMongoose.calledOnceWithExactly(findBill, [
      { query: 'find', args: [{ company: credentials.company._id, date: dateQuery }] },
      { query: 'populate', args: [{ path: 'thirdPartyPayer', select: '_id name' }] },
      { query: 'lean' },
    ]);
    sinon.assert.calledWithExactly(getDateQueryStub, { ...query, startDate: undefined });
  });
});

describe('getUnitInclTaxes', () => {
  let getMatchingVersion;
  let getLastVersion;
  beforeEach(() => {
    getMatchingVersion = sinon.stub(UtilsHelper, 'getMatchingVersion');
    getLastVersion = sinon.stub(UtilsHelper, 'getLastVersion');
  });
  afterEach(() => {
    getMatchingVersion.restore();
    getLastVersion.restore();
  });

  it('should return unitInclTaxes from subscription if no client', () => {
    const bill = {};
    const subscription = { unitInclTaxes: 20 };
    const result = BillHelper.getUnitInclTaxes(bill, subscription);

    expect(result).toBeDefined();
    expect(result).toBe('20');
    sinon.assert.notCalled(getLastVersion);
  });

  it('should return 0 if no matching funding found', () => {
    const tppId = new ObjectId();
    const bill = {
      thirdPartyPayer: { _id: tppId },
      customer: { fundings: [{ thirdPartyPayer: new ObjectId(), versions: [{ startDate: '2022-09-10T00:00:00' }] }] },
      createdAt: '2022-09-12T09:09:09',
    };
    const subscription = { unitInclTaxes: 20, events: [{ startDate: '2022-01-24T09:00:00' }] };
    getMatchingVersion.returns({ thirdPartyPayer: tppId, startDate: '2022-09-10T00:00:00' });
    getLastVersion.returns({ startDate: '2022-01-24T09:00:00' });

    const result = BillHelper.getUnitInclTaxes(bill, subscription);

    expect(result).toBe('0');
    sinon.assert.calledOnceWithExactly(getLastVersion, [{ startDate: '2022-01-24T09:00:00' }], 'startDate');
    sinon.assert.calledOnceWithExactly(
      getMatchingVersion,
      '2022-09-12T09:09:09',
      bill.customer.fundings[0],
      'createdAt',
      BillHelper.filterFundingVersion
    );
  });

  it('should return subscription unitInclTaxes for FIXED funding', () => {
    const tppId = new ObjectId();
    const bill = {
      thirdPartyPayer: { _id: tppId },
      customer: { fundings: [{ thirdPartyPayer: tppId, nature: 'fixed', versions: [{ amountTTC: 14.4 }] }] },
      createdAt: '2022-09-12T09:09:09',
    };
    const subscription = { vat: 20, unitInclTaxes: 12, events: [{ startDate: '2022-01-24T09:00:00' }] };
    getMatchingVersion.returns({
      thirdPartyPayer: tppId,
      nature: FIXED,
      amountTTC: 14.4,
      startDate: '2022-01-24T00:00:00',
      createdAt: '2022-01-17T13:59:23',
    });
    getLastVersion.returns({ startDate: '2022-01-24T09:00:00' });

    const result = BillHelper.getUnitInclTaxes(bill, subscription);

    expect(result).toBeDefined();
    expect(result).toBe('12');
    sinon.assert.calledOnceWithExactly(getLastVersion, [{ startDate: '2022-01-24T09:00:00' }], 'startDate');
    sinon.assert.calledOnceWithExactly(
      getMatchingVersion,
      '2022-09-12T09:09:09',
      bill.customer.fundings[0],
      'createdAt',
      BillHelper.filterFundingVersion
    );
  });

  it('should return unit incl taxes from funding if HOURLY funding', () => {
    const tppId = new ObjectId();
    const bill = {
      thirdPartyPayer: { _id: tppId },
      customer: {
        fundings: [
          {
            thirdPartyPayer: tppId,
            nature: 'hourly',
            versions: [
              { unitTTCRate: 18, startDate: '2022-01-23T00:00:00', createdAt: '2022-01-13T13:59:23' },
              { unitTTCRate: 24, startDate: '2022-01-24T00:00:00', createdAt: '2022-01-17T13:59:23' },
            ],
          },
          {
            thirdPartyPayer: tppId,
            nature: 'hourly',
            versions: [{
              unitTTCRate: 10,
              startDate: '2022-01-21T00:00:00',
              endDate: '2022-01-22T22:59:59',
              createdAt: '2022-01-13T13:59:23',
            }],
          },
        ],
      },
      createdAt: '2022-09-12T09:09:09',
    };
    const subscription = {
      vat: 20,
      events: [{ startDate: '2022-01-24T09:00:00' }, { startDate: '2022-01-25T09:00:00' }],
    };

    getLastVersion.returns({ startDate: '2022-01-25T09:00:00' });
    getMatchingVersion.returns({
      thirdPartyPayer: tppId,
      nature: 'hourly',
      unitTTCRate: 24,
      customerParticipationRate: 25,
      startDate: '2022-01-24T00:00:00',
      createdAt: '2022-01-17T13:59:23',
    });

    const result = BillHelper.getUnitInclTaxes(bill, subscription);

    expect(result).toBe('18');
    sinon.assert.calledOnceWithExactly(
      getLastVersion,
      [{ startDate: '2022-01-24T09:00:00' }, { startDate: '2022-01-25T09:00:00' }],
      'startDate'
    );
    sinon.assert.calledTwice(getMatchingVersion);
    sinon.assert.calledWithExactly(
      getMatchingVersion.getCall(0),
      '2022-09-12T09:09:09',
      bill.customer.fundings[0],
      'createdAt',
      BillHelper.filterFundingVersion
    );
    sinon.assert.calledWithExactly(
      getMatchingVersion.getCall(1),
      '2022-09-12T09:09:09',
      bill.customer.fundings[1],
      'createdAt',
      BillHelper.filterFundingVersion
    );
  });
});

describe('computeSurcharge', () => {
  it('should compute surcharges on an entire event', () => {
    const subscription = {
      unitInclTaxes: 24.47,
      vat: 5.5,
      service: { name: 'Temps de qualité - autonomie', nature: 'hourly' },
      events: [{
        _id: new ObjectId(),
        startDate: '2019-09-15T05:00:00.000+00:00',
        endDate: '2019-09-15T07:00:00.000+00:00',
        surcharges: [{ _id: new ObjectId(), percentage: 25, name: 'Dimanche' }],
      }],
    };

    const totalSurcharge = BillHelper.computeSurcharge(subscription);

    expect(totalSurcharge).toEqual('12.235');
  });

  it('should compute surcharges on a part of an event', () => {
    const subscription = {
      unitInclTaxes: 24.47,
      vat: 5.5,
      service: { name: 'Temps de qualité - autonomie', nature: 'hourly' },
      events: [{
        _id: new ObjectId(),
        startDate: '2019-09-15T19:00:00.000+00:00',
        endDate: '2019-09-15T21:15:00.000+00:00',
        surcharges: [{
          _id: new ObjectId(),
          startHour: '2019-09-15T20:00:00.000+00:00',
          endHour: '2019-09-15T21:15:00.000+00:00',
          percentage: 25,
          name: 'Soirée',
        }],
      }],
    };

    const totalSurcharge = BillHelper.computeSurcharge(subscription);

    expect(totalSurcharge).toEqual('7.646875');
  });

  it('should not compute totalSurcharges if there is no surcharge in a subscription', () => {
    const subscription = {
      unitInclTaxes: 24.47,
      vat: 5.5,
      service: { name: 'Temps de qualité - autonomie', nature: 'hourly' },
      events: [{
        _id: new ObjectId(),
        startDate: '2019-09-15T05:00:00.000+00:00',
        endDate: '2019-09-15T07:00:00.000+00:00',
      }],
    };

    const totalSurcharge = BillHelper.computeSurcharge(subscription);

    expect(totalSurcharge).toEqual('0');
  });
});

describe('formatBillDetailsForPdf', () => {
  let getUnitInclTaxes;
  let computeSurcharge;
  let formatPrice;
  let formatHour;
  let computeExclTaxesWithDiscount;
  beforeEach(() => {
    getUnitInclTaxes = sinon.stub(BillHelper, 'getUnitInclTaxes');
    computeSurcharge = sinon.stub(BillHelper, 'computeSurcharge');
    formatPrice = sinon.stub(UtilsHelper, 'formatPrice');
    formatHour = sinon.stub(UtilsHelper, 'formatHour');
    computeExclTaxesWithDiscount = sinon.stub(UtilsHelper, 'computeExclTaxesWithDiscount');
  });
  afterEach(() => {
    getUnitInclTaxes.restore();
    computeSurcharge.restore();
    formatPrice.restore();
    formatHour.restore();
    computeExclTaxesWithDiscount.restore();
  });

  it('should return formatted details if service.nature is hourly', () => {
    const bill = {
      netInclTaxes: 440.46,
      subscriptions: [{
        unitInclTaxes: 24.47,
        vat: 5.5,
        service: { name: 'Temps de qualité - autonomie', nature: 'hourly' },
        hours: 18,
        exclTaxes: 430.5444,
        inclTaxes: 440.46,
        discount: 0,
      }],
    };

    getUnitInclTaxes.returns('24.47');
    formatHour.onCall(0).returns('18,00 h');
    computeSurcharge.returns(0);
    formatPrice.onCall(0).returns('430,54 €');
    formatPrice.onCall(1).returns('23,68 €');
    computeExclTaxesWithDiscount.returns('430.5444');

    const formattedBillDetails = BillHelper.formatBillDetailsForPdf(bill);

    expect(formattedBillDetails).toEqual({
      formattedDetails: [{
        unitInclTaxes: '24.47',
        vat: 5.5,
        name: 'Temps de qualité - autonomie',
        volume: '18,00 h',
        total: '440.46',
      }],
      totalExclTaxes: '430,54 €',
      totalVAT: '23,68 €',
    });

    sinon.assert.calledOnceWithExactly(computeSurcharge, bill.subscriptions[0]);
  });

  it('should return formatted details if service.nature is fixed', () => {
    const bill = {
      netInclTaxes: 50,
      subscriptions: [{
        unitInclTaxes: 22,
        vat: 5.5,
        service: { name: 'Forfait nuit', nature: 'fixed' },
        hours: 0,
        exclTaxes: 20.3,
        inclTaxes: 22,
        discount: 5,
        events: [{
          _id: new ObjectId(),
          startDate: '2019-09-15T05:00:00.000+00:00',
          endDate: '2019-09-15T07:00:00.000+00:00',
          surcharges: [{ _id: new ObjectId(), percentage: 25, name: 'Dimanche' }],
        }],
      }],
      billingItemList: [
        {
          name: 'Frais de dossier',
          unitInclTaxes: 30,
          count: 1,
          inclTaxes: 30,
          exclTaxes: 27.27,
          discount: 10,
          vat: 10,
        },
        {
          name: 'Equipement de protection individuel',
          unitInclTaxes: 2,
          count: 5,
          inclTaxes: 10,
          exclTaxes: 8.33,
          discount: 0,
          vat: 15,
        },
      ],
    };

    getUnitInclTaxes.returns('22');
    computeSurcharge.returns('12.24');
    formatPrice.onCall(0).returns('20,30 €');
    formatPrice.onCall(1).returns('1,70 €');
    computeExclTaxesWithDiscount.onCall(0).returns('15.560664');
    computeExclTaxesWithDiscount.onCall(1).returns('18.179091');
    computeExclTaxesWithDiscount.onCall(2).returns('8.33');

    const formattedBillDetails = BillHelper.formatBillDetailsForPdf(bill);

    expect(formattedBillDetails).toEqual({
      formattedDetails: [
        { unitInclTaxes: '22', vat: 5.5, name: 'Forfait nuit', volume: 1, total: '22' },
        { name: 'Majorations', total: '12.24' },
        { name: 'Frais de dossier', unitInclTaxes: '30', volume: '1', total: '30', vat: 10 },
        { name: 'Equipement de protection individuel', unitInclTaxes: '2', volume: '5', total: '10', vat: 15 },
        { name: 'Remises', total: -15 },
        { name: 'Prise en charge du/des tiers(s) payeur(s)', total: '-9.24' },
      ],
      totalExclTaxes: '20,30 €',
      totalVAT: '1,70 €',
    });

    sinon.assert.calledOnceWithExactly(computeSurcharge, bill.subscriptions[0]);
    sinon.assert.notCalled(formatHour);
  });

  it('should return formatted details if service.nature is hourly and funding is fixed', () => {
    const subscriptionId = new ObjectId();
    const tppId = new ObjectId();
    const bill = {
      netInclTaxes: 50,
      forTpp: true,
      customer: {
        _id: new ObjectId(),
        identity: { title: 'mrs', firstname: 'Super', lastname: 'Test' },
        fundings: [
          {
            nature: 'fixed',
            subscription: subscriptionId,
            thirdPartyPayer: tppId,
            frequency: 'once',
            _id: new ObjectId(),
          },
        ],
      },
      thirdPartyPayer: {
        _id: tppId,
        address: {
          street: '21 Avenue du Général de Gaulle',
          fullAddress: '21 Avenue du Général de Gaulle 94000 Créteil',
          zipCode: '94000',
          city: 'Créteil',
        },
        name: 'Conseil Départemental du Val de Marne - APA- Direction de l\'autonomie',
        isUsedInFundings: true,
      },
      subscriptions: [{
        _id: subscriptionId,
        unitInclTaxes: 22,
        vat: 5.5,
        service: { name: 'Temps de qualité - autonomie ', nature: 'hourly' },
        hours: 15,
        exclTaxes: 312.8,
        inclTaxes: 330,
        discount: 0,
        events: [{
          _id: new ObjectId(),
          startDate: '2019-09-15T05:00:00.000+00:00',
          endDate: '2019-09-15T07:00:00.000+00:00',
          surcharges: [{ _id: new ObjectId(), percentage: 25, name: 'Dimanche' }],
        }],
      }],
    };

    getUnitInclTaxes.returns('22');
    formatHour.returns('15,00 h');
    computeSurcharge.returns(0);
    formatPrice.onCall(0).returns('50,00 €');
    formatPrice.onCall(1).returns('2,61 €');
    computeExclTaxesWithDiscount.returns(312.8);

    const formattedBillDetails = BillHelper.formatBillDetailsForPdf(bill);

    expect(formattedBillDetails).toEqual({
      formattedDetails: [
        { unitInclTaxes: '22', vat: 5.5, name: 'Temps de qualité - autonomie ', volume: '15,00 h', total: '50' },
      ],
      totalExclTaxes: '50,00 €',
      totalVAT: '2,61 €',
    });

    sinon.assert.calledOnceWithExactly(computeSurcharge, bill.subscriptions[0]);
    sinon.assert.calledOnceWithExactly(formatHour, 15);
    sinon.assert.calledOnceWithExactly(computeExclTaxesWithDiscount, 312.8, 0, 5.5);
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
    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId } };
    const bill = { _id: new ObjectId(), number: 'number' };
    findOneBill.returns(SinonMongoose.stubChainedQueries(bill));
    findOneCompany.returns(SinonMongoose.stubChainedQueries(credentials.company, ['lean']));
    formatPdf.returns({ data: 'data' });
    generatePdf.returns({ pdf: 'pdf' });
    getPdfContent.returns({ content: [{ text: 'data' }] });

    const result = await BillHelper.generateBillPdf({ _id: bill._id }, credentials);

    expect(result).toEqual({ billNumber: bill.number, pdf: { pdf: 'pdf' } });
    sinon.assert.calledWithExactly(formatPdf, bill, credentials.company);
    sinon.assert.calledWithExactly(generatePdf, { content: [{ text: 'data' }] });
    sinon.assert.calledOnceWithExactly(getPdfContent, { data: 'data' });
    SinonMongoose.calledOnceWithExactly(findOneBill, [
      { query: 'findOne', args: [{ _id: bill._id, origin: 'compani' }] },
      { query: 'populate', args: [{ path: 'thirdPartyPayer', select: '_id name address' }] },
      { query: 'populate', args: [{ path: 'customer', select: '_id identity contact fundings' }] },
      { query: 'populate', args: [{ path: 'subscriptions.events.auxiliary', select: 'identity' }] },
      { query: 'lean' },
    ]);
    SinonMongoose.calledOnceWithExactly(findOneCompany, [
      {
        query: 'findOne',
        args: [{ _id: companyId }, { rcs: 1, rna: 1, address: 1, logo: 1, name: 1, 'customersConfig.billFooter': 1 }],
      },
      { query: 'lean' },
    ]);
  });
});
