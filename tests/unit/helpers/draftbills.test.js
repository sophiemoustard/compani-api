const sinon = require('sinon');
const expect = require('expect');
const moment = require('moment');
const { ObjectId } = require('mongodb');
const omit = require('lodash/omit');
const SinonMongoose = require('../sinonMongoose');
const BillingItem = require('../../../src/models/BillingItem');
const Surcharge = require('../../../src/models/Surcharge');
const ThirdPartyPayer = require('../../../src/models/ThirdPartyPayer');
const FundingHistory = require('../../../src/models/FundingHistory');
const DraftBillsHelper = require('../../../src/helpers/draftBills');
const UtilsHelper = require('../../../src/helpers/utils');
const SurchargesHelper = require('../../../src/helpers/surcharges');
const FundingsHelper = require('../../../src/helpers/fundings');
const EventRepository = require('../../../src/repositories/EventRepository');
const { BILLING_DIRECT, BILLING_INDIRECT } = require('../../../src/helpers/constants');

describe('populateAndFormatSubscription', () => {
  it('should populate surcharge and billing items and sort versions', async () => {
    const surchargeId = new ObjectId();
    const bddSurcharges = [{ _id: surchargeId, sundaySurcharge: 10 }];
    const billingItemId1 = new ObjectId();
    const billingItemId2 = new ObjectId();
    const bddBillingItems = [
      { _id: billingItemId1, defaultUnitAmount: 2 },
      { _id: billingItemId2, defaultUnitAmount: 3 },
    ];
    const subscription = {
      _id: 'abc',
      versions: [{ unitTTCRate: 13, _id: 5 }, { unitTTCRate: 15, _id: 4 }],
      service: {
        versions: [
          { billingItems: [], startDate: new Date('2019-02-24'), _id: 1 },
          { billingItems: [], surcharge: surchargeId, startDate: new Date('2019-03-20'), _id: 2 },
          { billingItems: [], surcharge: surchargeId, startDate: new Date('2019-02-29'), _id: 3 },
          {
            billingItems: [billingItemId1, billingItemId2],
            surcharge: surchargeId,
            startDate: new Date('2019-02-25'),
            _id: 4,
          },
        ],
      },
    };

    const result = await DraftBillsHelper.populateAndFormatSubscription(subscription, bddSurcharges, bddBillingItems);

    expect(result).toEqual(expect.objectContaining({
      _id: 'abc',
      versions: [{ unitTTCRate: 13, _id: 5 }, { unitTTCRate: 15, _id: 4 }],
      service: {
        versions: [
          {
            billingItems: [],
            surcharge: { _id: surchargeId, sundaySurcharge: 10 },
            startDate: new Date('2019-03-20'),
            _id: 2,
          },
          {
            billingItems: [],
            surcharge: { _id: surchargeId, sundaySurcharge: 10 },
            startDate: new Date('2019-03-01'),
            _id: 3,
          },
          {
            billingItems: [
              { _id: billingItemId1, defaultUnitAmount: 2 },
              { _id: billingItemId2, defaultUnitAmount: 3 },
            ],
            surcharge: { _id: surchargeId, sundaySurcharge: 10 },
            startDate: new Date('2019-02-25'),
            _id: 4,
          },
          { billingItems: [], startDate: new Date('2019-02-24'), _id: 1 },
        ],
      },
    }));
  });
});

describe('populateFundings', () => {
  let findOneFundingHistory;
  let findFundingHistory;
  let mergeLastVersionWithBaseObjectStub;

  beforeEach(() => {
    findOneFundingHistory = sinon.stub(FundingHistory, 'findOne');
    findFundingHistory = sinon.stub(FundingHistory, 'find');
    mergeLastVersionWithBaseObjectStub = sinon.stub(UtilsHelper, 'mergeLastVersionWithBaseObject');
  });
  afterEach(() => {
    findOneFundingHistory.restore();
    findFundingHistory.restore();
    mergeLastVersionWithBaseObjectStub.restore();
  });

  it('should return empty array if input empty', async () => {
    const companyId = new ObjectId();
    const result = await DraftBillsHelper.populateFundings([], new Date(), null, companyId);
    expect(result).toEqual([]);
  });

  it('should populate third party payer funding', async () => {
    const companyId = new ObjectId();
    const tppId = new ObjectId();
    const fundings = [{ thirdPartyPayer: tppId, _id: new ObjectId(), versions: [] }];
    const tpps = [{ _id: tppId, billingMode: BILLING_DIRECT }];
    const funding = { ...omit(fundings[0], ['versions']) };
    mergeLastVersionWithBaseObjectStub.returns(funding);
    findOneFundingHistory.returns(SinonMongoose.stubChainedQueries(null, ['lean']));

    const result = await DraftBillsHelper.populateFundings(fundings, new Date(), tpps, companyId);

    expect(result[0].thirdPartyPayer._id).toEqual(tppId);
    sinon.assert.called(mergeLastVersionWithBaseObjectStub);
    SinonMongoose.calledOnceWithExactly(findOneFundingHistory, [
      { query: 'findOne', args: [{ fundingId: fundings[0]._id }] },
      { query: 'lean' },
    ]);
  });

  it('should populate funding history with once frequency and history', async () => {
    const companyId = new ObjectId();
    const fundingId = new ObjectId();
    const tppId = new ObjectId();
    const fundings = [{
      _id: new ObjectId(),
      thirdPartyPayer: tppId,
      frequency: 'once',
      versions: [{ _id: fundingId }],
    }];
    const tpps = [{ _id: tppId, billingMode: BILLING_DIRECT }];
    const funding = { ...fundings[0].versions[0], ...omit(fundings[0], ['versions']) };
    const returnedHistory = { careHours: 4, fundingId };
    mergeLastVersionWithBaseObjectStub.returns(funding);
    findOneFundingHistory.returns(SinonMongoose.stubChainedQueries(returnedHistory, ['lean']));

    const result = await DraftBillsHelper.populateFundings(fundings, new Date(), tpps, companyId);

    expect(result[0].history).toMatchObject([{ careHours: 4, fundingId }]);
    sinon.assert.called(mergeLastVersionWithBaseObjectStub);
    SinonMongoose.calledOnceWithExactly(findOneFundingHistory, [
      { query: 'findOne', args: [{ fundingId: fundings[0]._id }] },
      { query: 'lean' },
    ]);
  });

  it('should populate funding history with once frequency and without history', async () => {
    const companyId = new ObjectId();
    const fundingId = new ObjectId();
    const tppId = new ObjectId();
    const fundings = [{
      _id: fundingId,
      thirdPartyPayer: tppId,
      frequency: 'once',
      versions: [{ _id: fundingId }],
    }];
    const tpps = [{ _id: tppId, billingMode: BILLING_DIRECT }];
    const funding = { ...fundings[0].versions[0], ...omit(fundings[0], ['versions']) };
    mergeLastVersionWithBaseObjectStub.returns(funding);
    findOneFundingHistory.returns(SinonMongoose.stubChainedQueries(null, ['lean']));

    const result = await DraftBillsHelper.populateFundings(fundings, new Date(), tpps, companyId);

    expect(result[0].history).toMatchObject([{ careHours: 0, amountTTC: 0, fundingId }]);
    sinon.assert.called(mergeLastVersionWithBaseObjectStub);
    SinonMongoose.calledOnceWithExactly(findOneFundingHistory, [
      { query: 'findOne', args: [{ fundingId: fundings[0]._id }] },
      { query: 'lean' },
    ]);
  });

  it('should populate funding history with monthly frequency', async () => {
    const companyId = new ObjectId();
    const fundingId = new ObjectId();
    const tppId = new ObjectId();
    const fundings = [{
      _id: fundingId,
      thirdPartyPayer: tppId,
      frequency: 'monthly',
      versions: [{ _id: fundingId }],
    }];
    const tpps = [{ _id: tppId, billingMode: BILLING_DIRECT }];
    const returnedHistories = [
      { careHours: 3, fundingId, month: '01/2019' },
      { careHours: 5, fundingId, month: '02/2019' },
    ];
    const funding = { ...fundings[0].versions[0], ...omit(fundings[0], ['versions']) };
    mergeLastVersionWithBaseObjectStub.returns(funding);
    findFundingHistory.returns(SinonMongoose.stubChainedQueries(returnedHistories, ['lean']));

    const result = await DraftBillsHelper.populateFundings(fundings, new Date('2019/03/10'), tpps, companyId);

    expect(result[0].history.length).toEqual(3);
    const addedHistory = result[0].history.find(hist => hist.month === '03/2019');
    expect(addedHistory).toMatchObject({ careHours: 0, amountTTC: 0, fundingId, month: '03/2019' });
    sinon.assert.called(mergeLastVersionWithBaseObjectStub);
    SinonMongoose.calledOnceWithExactly(findFundingHistory, [
      { query: 'find', args: [{ fundingId: fundings[0]._id, company: companyId }] },
      { query: 'lean' },
    ]);
  });

  it('shouldn\'t populate third party payer funding if billing mode is indirect', async () => {
    const companyId = new ObjectId();
    const tppIndirectId = new ObjectId();
    const fundings = [
      { thirdPartyPayer: tppIndirectId, _id: new ObjectId(), versions: [] },
    ];
    const tpps = [{ _id: tppIndirectId, billingMode: BILLING_INDIRECT }];
    const funding = { ...omit(fundings[0], ['versions']) };
    mergeLastVersionWithBaseObjectStub.returns(funding);

    const result = await DraftBillsHelper.populateFundings(fundings, new Date(), tpps, companyId);

    expect(result).toEqual([]);
    sinon.assert.called(mergeLastVersionWithBaseObjectStub);
  });
});

describe('getSurchargedPrice', () => {
  it('should return the price if there is no surcharge', () => {
    const event = { startDate: '2019-06-29T10:00:00.000+02:00', endDate: '2019-06-29T16:00:00.000+02:00' };

    const result = DraftBillsHelper.getSurchargedPrice(event, [], 11);

    expect(result).toBe(11);
  });

  it('should return the price if less than one minute', () => {
    const event = { startDate: '2019-06-29T10:00:00.000+02:00', endDate: '2019-06-29T10:00:02.000+02:00' };

    const result = DraftBillsHelper.getSurchargedPrice(event, [], 11);

    expect(result).toBe(0);
  });

  it('should return the price surcharged globally', () => {
    const event = { startDate: '2019-06-29T10:00:00.000+02:00', endDate: '2019-06-29T16:00:00.000+02:00' };
    const surcharges = [{ percentage: 25 }];

    const result = DraftBillsHelper.getSurchargedPrice(event, surcharges, 10);

    expect(result).toBe(12.5);
  });

  it('should return the price surcharged once', () => {
    const event = { startDate: '2019-06-29T10:00:00.000+02:00', endDate: '2019-06-29T16:00:00.000+02:00' };
    const surcharges = [{
      percentage: 25,
      startHour: moment(event.startDate).add(1, 'h'),
      endHour: moment(event.startDate).add(2, 'h'),
    }];

    const result = DraftBillsHelper.getSurchargedPrice(event, surcharges, 24);

    expect(result).toBe(25);
  });

  it('should return the price surcharged twice', () => {
    const event = { startDate: '2019-06-29T10:00:00.000+02:00', endDate: '2019-06-29T16:00:00.000+02:00' };
    const surcharges = [{
      percentage: 25,
      startHour: moment(event.startDate).add(1, 'h'),
      endHour: moment(event.startDate).add(2, 'h'),
    }, {
      percentage: 20,
      startHour: moment(event.startDate).add(2, 'h'),
      endHour: moment(event.startDate).add(4, 'h'),
    }];

    const result = DraftBillsHelper.getSurchargedPrice(event, surcharges, 24);

    expect(result).toBe(26.6);
  });
});

describe('getThirdPartyPayerPrice', () => {
  it('should compute tpp price', () => {
    expect(DraftBillsHelper.getThirdPartyPayerPrice(180, 10, 20)).toEqual(24);
  });
});

describe('getMatchingHistory', () => {
  it('should return history for once frequency', () => {
    const fundingId = new ObjectId();
    const funding = { _id: fundingId, frequency: 'once', history: [{ fundingId, careHours: 2 }] };

    const result = DraftBillsHelper.getMatchingHistory({}, funding);

    expect(result.fundingId).toEqual(fundingId);
  });

  it('should return existing history for monthly frequency', () => {
    const fundingId = new ObjectId();
    const funding = {
      _id: fundingId,
      frequency: 'monthly',
      history: [{ fundingId, careHours: 2, month: '03/2019' }, { fundingId, careHours: 4, month: '02/2019' }],
    };
    const event = { startDate: new Date('2019/03/12') };

    const result = DraftBillsHelper.getMatchingHistory(event, funding);

    expect(result).toMatchObject({ fundingId, careHours: 2, month: '03/2019' });
  });

  it('should create history and add to list when missing for monthly frequency', () => {
    const fundingId = new ObjectId();
    const funding = {
      _id: fundingId,
      frequency: 'monthly',
      history: [{ fundingId, careHours: 2, month: '01/2019' }, { fundingId, careHours: 4, month: '02/2019' }],
    };
    const event = { startDate: new Date('2019/03/12') };

    const result = DraftBillsHelper.getMatchingHistory(event, funding);

    expect(result).toMatchObject({ careHours: 0, amountTTC: 0, fundingId, month: '03/2019' });
  });
});

describe('getHourlyFundingSplit', () => {
  const price = 50;
  const event = { startDate: '2019-02-12T08:00:00.000Z', endDate: '2019-02-12T10:00:00.000Z' };
  let getMatchingHistory;
  let getThirdPartyPayerPrice;
  beforeEach(() => {
    getMatchingHistory = sinon.stub(DraftBillsHelper, 'getMatchingHistory');
    getThirdPartyPayerPrice = sinon.stub(DraftBillsHelper, 'getThirdPartyPayerPrice');
  });
  afterEach(() => {
    getMatchingHistory.restore();
    getThirdPartyPayerPrice.restore();
  });

  it('case 1. Event fully invoiced to TPP', () => {
    const funding = {
      _id: new ObjectId(),
      unitTTCRate: 21,
      careHours: 4,
      frequency: 'once',
      nature: 'hourly',
      customerParticipationRate: 20,
      history: { careHours: 1 },
      thirdPartyPayer: { _id: new ObjectId() },
    };

    getMatchingHistory.returns({ careHours: 1 });
    getThirdPartyPayerPrice.returns(28);

    const result = DraftBillsHelper.getHourlyFundingSplit(event, funding, price);
    expect(result.customerPrice).toEqual(22);
    expect(result.thirdPartyPayerPrice).toEqual(28);
    expect(result.history.careHours).toEqual(2);
    sinon.assert.calledWithExactly(getThirdPartyPayerPrice, 120, 21, 20);
  });

  it('case 2. Event partially invoiced to TPP', () => {
    const funding = {
      _id: new ObjectId(),
      unitTTCRate: 21,
      careHours: 4,
      frequency: 'once',
      customerParticipationRate: 20,
      history: { careHours: 3 },
      thirdPartyPayer: { _id: new ObjectId() },
    };

    getMatchingHistory.returns({ careHours: 3 });
    getThirdPartyPayerPrice.returns(14);

    const result = DraftBillsHelper.getHourlyFundingSplit(event, funding, price);

    expect(result.customerPrice).toEqual(36);
    expect(result.thirdPartyPayerPrice).toEqual(14);
    expect(result.history.careHours).toEqual(1);
    sinon.assert.calledWithExactly(getThirdPartyPayerPrice, 60, 21, 20);
  });
});

describe('getFixedFundingSplit', () => {
  const price = 50;
  const event = { startDate: '2019-02-12T08:00:00.000Z', endDate: '2019-02-12T10:00:00.000Z' };

  it('Case 1. Event fully invoiced to TPP', () => {
    const funding = {
      history: [{ amountTTC: 10 }],
      amountTTC: 100,
      thirdPartyPayer: { _id: new ObjectId() },
    };

    const result = DraftBillsHelper.getFixedFundingSplit(event, funding, price);

    expect(result.customerPrice).toEqual(0);
    expect(result.thirdPartyPayerPrice).toEqual(50);
    expect(result.history.amountTTC).toEqual(50);
  });

  it('Case 2. Event partially invoiced to TPP', () => {
    const funding = {
      history: [{ amountTTC: 79 }],
      amountTTC: 100,
      thirdPartyPayer: { _id: new ObjectId() },
    };

    const result = DraftBillsHelper.getFixedFundingSplit(event, funding, price);

    expect(result.customerPrice).toEqual(29);
    expect(result.thirdPartyPayerPrice).toEqual(21);
    expect(result.history.amountTTC).toEqual(21);
  });
});

describe('getEventBilling', () => {
  const unitTTCRate = 21;
  const event = { startDate: '2019-02-12T08:00:00.000Z', endDate: '2019-02-12T10:00:00.000Z' };

  let getEventSurcharges;
  let getSurchargedPrice;
  let getHourlyFundingSplit;
  let getFixedFundingSplit;
  beforeEach(() => {
    getEventSurcharges = sinon.stub(SurchargesHelper, 'getEventSurcharges');
    getSurchargedPrice = sinon.stub(DraftBillsHelper, 'getSurchargedPrice');
    getHourlyFundingSplit = sinon.stub(DraftBillsHelper, 'getHourlyFundingSplit');
    getFixedFundingSplit = sinon.stub(DraftBillsHelper, 'getFixedFundingSplit');
  });
  afterEach(() => {
    getEventSurcharges.restore();
    getSurchargedPrice.restore();
    getHourlyFundingSplit.restore();
    getFixedFundingSplit.restore();
  });

  it('should return event prices with fixed service wihtout funding and without surcharge', () => {
    const service = { nature: 'fixed', vat: 20 };

    const result = DraftBillsHelper.getEventBilling(event, unitTTCRate, service);

    expect(result).toEqual({ customerPrice: 21, thirdPartyPayerPrice: 0 });
    sinon.assert.notCalled(getHourlyFundingSplit);
    sinon.assert.notCalled(getFixedFundingSplit);
    sinon.assert.notCalled(getEventSurcharges);
    sinon.assert.notCalled(getSurchargedPrice);
  });

  it('should return event prices with hourly service wihtout funding and without surcharge', () => {
    const service = { nature: 'hourly', vat: 20 };

    const result = DraftBillsHelper.getEventBilling(event, unitTTCRate, service);

    expect(result).toEqual({ customerPrice: 42, thirdPartyPayerPrice: 0 });
    sinon.assert.notCalled(getHourlyFundingSplit);
    sinon.assert.notCalled(getFixedFundingSplit);
    sinon.assert.notCalled(getEventSurcharges);
    sinon.assert.notCalled(getSurchargedPrice);
  });

  it('should return event prices with surcharge', () => {
    const service = { vat: 20, nature: 'hourly', surcharge: { publicHoliday: 10 } };
    getSurchargedPrice.returns(46.2);
    getEventSurcharges.returns([{ percentage: 10 }]);

    const result = DraftBillsHelper.getEventBilling(event, unitTTCRate, service);

    expect(result).toEqual({ customerPrice: 46.2, thirdPartyPayerPrice: 0, surcharges: [{ percentage: 10 }] });
    sinon.assert.calledOnce(getEventSurcharges);
    sinon.assert.calledWithExactly(getSurchargedPrice, event, [{ percentage: 10 }], 42);
    sinon.assert.notCalled(getHourlyFundingSplit);
    sinon.assert.notCalled(getFixedFundingSplit);
  });

  it('should return event prices with hourly funding', () => {
    const service = { vat: 20, nature: 'fixed' };
    const funding = {
      nature: 'hourly',
      unitTTCRate: 15,
      careHours: 4,
      frequency: 'once',
      customerParticipationRate: 0,
      history: { careHours: 1 },
      thirdPartyPayer: { _id: new ObjectId() },
    };
    getHourlyFundingSplit.returns({ customerPrice: 0, thirdPartyPayerPrice: 42 });

    const result = DraftBillsHelper.getEventBilling(event, unitTTCRate, service, funding);

    expect(result).toEqual({ customerPrice: 0, thirdPartyPayerPrice: 42 });
    sinon.assert.calledWithExactly(getHourlyFundingSplit, event, funding, 21);
    sinon.assert.notCalled(getFixedFundingSplit);
    sinon.assert.notCalled(getEventSurcharges);
    sinon.assert.notCalled(getSurchargedPrice);
  });

  it('should return event prices with fixed funding', () => {
    const service = { vat: 20, nature: 'hourly' };
    const funding = {
      nature: 'fixed',
      history: { amountTTC: 50 },
      amountTTC: 100,
      thirdPartyPayer: { _id: new ObjectId() },
    };
    getFixedFundingSplit.returns({ customerPrice: 0, thirdPartyPayerPrice: 42 });

    const result = DraftBillsHelper.getEventBilling(event, unitTTCRate, service, funding);

    expect(result).toEqual({ customerPrice: 0, thirdPartyPayerPrice: 42 });
    sinon.assert.calledWithExactly(getFixedFundingSplit, event, funding, 42);
    sinon.assert.notCalled(getHourlyFundingSplit);
    sinon.assert.notCalled(getEventSurcharges);
    sinon.assert.notCalled(getSurchargedPrice);
  });

  it('should return event prices with hourly funding and surcharge', () => {
    const service = { vat: 20, nature: 'hourly', surcharge: { publicHoliday: 10 } };
    const funding = {
      nature: 'hourly',
      unitTTCRate: 15,
      careHours: 4,
      frequency: 'once',
      customerParticipationRate: 0,
      history: { careHours: 1 },
      thirdPartyPayer: { _id: new ObjectId() },
    };

    getHourlyFundingSplit.returns({ customerPrice: 21.2, thirdPartyPayerPrice: 25 });
    getSurchargedPrice.returns(46.2);
    getEventSurcharges.returns([{ percentage: 10 }]);

    const result = DraftBillsHelper.getEventBilling(event, unitTTCRate, service, funding);

    expect(result).toEqual({ customerPrice: 21.2, thirdPartyPayerPrice: 25, surcharges: [{ percentage: 10 }] });
    sinon.assert.calledWithExactly(getHourlyFundingSplit, event, funding, 46.2);
    sinon.assert.notCalled(getFixedFundingSplit);
    sinon.assert.calledOnce(getEventSurcharges);
    sinon.assert.calledOnce(getSurchargedPrice);
  });

  it('should return event prices with fixed funding and surcharge', () => {
    const service = { vat: 20, nature: 'hourly', surcharge: { publicHoliday: 10 } };
    const funding = {
      nature: 'fixed',
      history: { amountTTC: 50 },
      amountTTC: 100,
      thirdPartyPayer: { _id: new ObjectId() },
    };

    getFixedFundingSplit.returns({ customerPrice: 0, thirdPartyPayerPrice: 46.2 });
    getSurchargedPrice.returns(46.2);
    getEventSurcharges.returns([{ percentage: 10 }]);

    const result = DraftBillsHelper.getEventBilling(event, unitTTCRate, service, funding);

    expect(result).toEqual({ customerPrice: 0, thirdPartyPayerPrice: 46.2, surcharges: [{ percentage: 10 }] });
    sinon.assert.calledWithExactly(getFixedFundingSplit, event, funding, 46.2);
    sinon.assert.notCalled(getHourlyFundingSplit);
    sinon.assert.calledOnce(getEventSurcharges);
    sinon.assert.calledOnce(getSurchargedPrice);
  });

  it('should not bill third party payer if event is cancelled', () => {
    const cancelledEvent = { ...event, isCancelled: true };
    const service = { vat: 20, nature: 'hourly' };
    const funding = {
      nature: 'fixed',
      history: { amountTTC: 50 },
      amountTTC: 100,
      thirdPartyPayer: { _id: new ObjectId() },
    };

    const result = DraftBillsHelper.getEventBilling(cancelledEvent, unitTTCRate, service, funding);

    expect(result).toEqual({ customerPrice: 42, thirdPartyPayerPrice: 0 });
    sinon.assert.notCalled(getHourlyFundingSplit);
    sinon.assert.notCalled(getFixedFundingSplit);
    sinon.assert.notCalled(getEventSurcharges);
    sinon.assert.notCalled(getSurchargedPrice);
  });
});

describe('formatDraftBillsForCustomer', () => {
  let getExclTaxes;

  beforeEach(() => {
    getExclTaxes = sinon.stub(UtilsHelper, 'getExclTaxes');
  });

  afterEach(() => {
    getExclTaxes.restore();
  });

  it('should format bill for customer', () => {
    const customerPrices = { exclTaxes: 20, inclTaxes: 25, hours: 3, eventsList: [{ event: '123456' }] };
    const event = { _id: 'abc', startDate: '2019-02-12T08:00:00.000Z', endDate: '2019-02-12T10:00:00.000Z' };
    const service = { vat: 20 };
    const eventPrice = { customerPrice: 21 };

    getExclTaxes.returns(17.5);

    const result = DraftBillsHelper.formatDraftBillsForCustomer(customerPrices, event, eventPrice, service);

    expect(result).toMatchObject({
      eventsList: [
        { event: '123456' },
        { event: 'abc', inclTaxesCustomer: 21, exclTaxesCustomer: 17.5 },
      ],
      hours: 5,
      exclTaxes: 37.5,
      inclTaxes: 46,
    });
    sinon.assert.calledOnceWithExactly(getExclTaxes, 21, 20);
  });

  it('should format bill for customer with surcharge', () => {
    const customerPrices = { exclTaxes: 20, inclTaxes: 25, hours: 3, eventsList: [{ event: '123456' }] };
    const event = { _id: 'abc', startDate: '2019-02-12T08:00:00.000Z', endDate: '2019-02-12T10:00:00.000Z' };
    const service = { vat: 20 };
    const eventPrice = { customerPrice: 21, surcharges: [{ name: 'test' }] };

    getExclTaxes.returns(17.5);

    const result = DraftBillsHelper.formatDraftBillsForCustomer(customerPrices, event, eventPrice, service);

    expect(result).toMatchObject({
      eventsList: [
        { event: '123456' },
        { event: 'abc', inclTaxesCustomer: 21, exclTaxesCustomer: 17.5, surcharges: [{ name: 'test' }] },
      ],
      hours: 5,
      exclTaxes: 37.5,
      inclTaxes: 46,
    });
    sinon.assert.calledOnceWithExactly(getExclTaxes, 21, 20);
  });

  it('should format bill for customer with tpp info', () => {
    const customerPrices = { exclTaxes: 20, inclTaxes: 25, hours: 3, eventsList: [{ event: '123456' }] };
    const event = { _id: 'abc', startDate: '2019-02-12T08:00:00.000Z', endDate: '2019-02-12T10:00:00.000Z' };
    const service = { vat: 20 };
    const eventPrice = { customerPrice: 21, thirdPartyPayerPrice: 15, thirdPartyPayer: 'tpp' };
    getExclTaxes.onCall(0).returns(17.5);
    getExclTaxes.onCall(1).returns(12.5);

    const result = DraftBillsHelper.formatDraftBillsForCustomer(customerPrices, event, eventPrice, service);

    expect(result).toMatchObject({
      eventsList: [
        { event: '123456' },
        {
          event: 'abc',
          inclTaxesCustomer: 21,
          exclTaxesCustomer: 17.5,
          exclTaxesTpp: 12.5,
          inclTaxesTpp: 15,
          thirdPartyPayer: 'tpp',
        },
      ],
      hours: 5,
      exclTaxes: 37.5,
      inclTaxes: 46,
    });
    sinon.assert.calledWithExactly(getExclTaxes.getCall(0), 21, 20);
    sinon.assert.calledWithExactly(getExclTaxes.getCall(1), 15, 20);
  });
});

describe('computeBillingInfoForEvents', () => {
  let getMatchingVersion;
  let getMatchingFunding;
  let getEventBilling;
  let formatDraftBillsForCustomer;
  let formatDraftBillsForTPP;

  beforeEach(() => {
    getMatchingVersion = sinon.stub(UtilsHelper, 'getMatchingVersion');
    getMatchingFunding = sinon.stub(FundingsHelper, 'getMatchingFunding');
    getEventBilling = sinon.stub(DraftBillsHelper, 'getEventBilling');
    formatDraftBillsForCustomer = sinon.stub(DraftBillsHelper, 'formatDraftBillsForCustomer');
    formatDraftBillsForTPP = sinon.stub(DraftBillsHelper, 'formatDraftBillsForTPP');
  });

  afterEach(() => {
    getMatchingVersion.restore();
    getMatchingFunding.restore();
    getEventBilling.restore();
    formatDraftBillsForCustomer.restore();
    formatDraftBillsForTPP.restore();
  });

  it('should compute info for each event', () => {
    const events = [
      { _id: new ObjectId(), startDate: '2021-02-04T12:00:00.000Z' },
      { _id: new ObjectId(), startDate: '2021-03-05T10:00:00.000Z' },
    ];
    const service = {
      _id: new ObjectId(),
      versions: [
        {
          billingItems: [
            { _id: new ObjectId('d00000000000000000000000'), name: 'skusku' },
            { _id: new ObjectId('d00000000000000000000001'), name: 'skusku 2' },
          ],
        },
        { billingItems: [{ _id: new ObjectId('d00000000000000000000001'), name: 'skusku 3' }] },
      ],
    };
    const fundings = [];
    const startDate = moment('2021/03/01', 'YYYY/MM/DD');
    const matchingService1 = {
      _id: service._id,
      name: 'test',
      billingItems: [
        { _id: new ObjectId('d00000000000000000000000'), name: 'skusku' },
        { _id: new ObjectId('d00000000000000000000001'), name: 'skusku 2' },
      ],
    };
    const matchingService2 = {
      _id: service._id,
      name: 'test',
      billingItems: [{ _id: new ObjectId('d00000000000000000000001'), name: 'skusku 3' }],
    };

    getMatchingVersion.onCall(0).returns(matchingService1);
    getMatchingVersion.onCall(1).returns(matchingService2);
    getEventBilling.onCall(0).returns({ customerPrice: 20 });
    getEventBilling.onCall(1).returns({ customerPrice: 15 });
    formatDraftBillsForCustomer.onCall(0).returns({ exclTaxes: 12, inclTaxes: 15, hours: 2, eventsList: [events[0]] });
    formatDraftBillsForCustomer.onCall(1).returns({ exclTaxes: 45, inclTaxes: 50, hours: 6, eventsList: events });

    const result = DraftBillsHelper.computeBillingInfoForEvents(events, service, fundings, startDate, 12);

    expect(result).toEqual({
      prices: {
        customerPrices: { exclTaxes: 45, inclTaxes: 50, hours: 6, eventsList: events },
        thirdPartyPayerPrices: {},
        startDate: moment('2021-02-04T12:00:00.000Z'),
      },
      eventsByBillingItem: {
        d00000000000000000000000: [{ _id: events[0]._id, startDate: '2021-02-04T12:00:00.000Z' }],
        d00000000000000000000001: [
          { _id: events[0]._id, startDate: '2021-02-04T12:00:00.000Z' },
          { _id: events[1]._id, startDate: '2021-03-05T10:00:00.000Z' },
        ],
      },
    });
    sinon.assert.calledWithExactly(getMatchingVersion.getCall(0), '2021-02-04T12:00:00.000Z', service, 'startDate');
    sinon.assert.calledWithExactly(getMatchingVersion.getCall(1), '2021-03-05T10:00:00.000Z', service, 'startDate');
    sinon.assert.calledWithExactly(getEventBilling.getCall(0), events[0], 12, matchingService1, null);
    sinon.assert.calledWithExactly(getEventBilling.getCall(1), events[1], 12, matchingService2, null);
    sinon.assert.calledWithExactly(
      formatDraftBillsForCustomer.getCall(0),
      { exclTaxes: 0, inclTaxes: 0, hours: 0, eventsList: [] },
      events[0],
      { customerPrice: 20 },
      matchingService1
    );
    sinon.assert.calledWithExactly(
      formatDraftBillsForCustomer.getCall(1),
      { exclTaxes: 12, inclTaxes: 15, hours: 2, eventsList: [events[0]] },
      events[1],
      { customerPrice: 15 },
      matchingService2
    );
    sinon.assert.notCalled(getMatchingFunding);
    sinon.assert.notCalled(formatDraftBillsForTPP);
  });

  it('should compute info with fundings', () => {
    const events = [
      { _id: new ObjectId(), startDate: '2021-03-04T12:00:00.000Z' },
      { _id: new ObjectId(), startDate: '2021-03-05T10:00:00.000Z' },
      { _id: new ObjectId(), startDate: '2021-03-06T10:00:00.000Z' },
    ];
    const service = {
      _id: new ObjectId(),
      versions: [{
        billingItems: [{ _id: new ObjectId('d00000000000000000000000'), name: 'skusku' }],
      }],
    };
    const matchingService = {
      _id: service._id,
      name: 'test',
      billingItems: [{ _id: new ObjectId('d00000000000000000000000'), name: 'skusku' }],
    };
    const fundings = [{ _id: new ObjectId() }];
    const matchingFunding = { ...fundings[0], thirdPartyPayer: 'tpp' };
    const startDate = moment('2021/03/01', 'YYYY/MM/DD');

    getMatchingVersion.returns(matchingService);
    getMatchingFunding.onCall(0).returns(null);
    getMatchingFunding.onCall(1).returns(matchingFunding);
    getMatchingFunding.onCall(2).returns(matchingFunding);
    getEventBilling.onCall(0).returns({ customerPrice: 20 });
    getEventBilling.onCall(1).returns({ customerPrice: 15, thirdPartyPayerPrice: 12 });
    getEventBilling.onCall(2).returns({ customerPrice: 17, thirdPartyPayerPrice: 15 });
    formatDraftBillsForCustomer.onCall(0).returns({ exclTaxes: 12, inclTaxes: 15, hours: 2, eventsList: [events[0]] });
    formatDraftBillsForCustomer.onCall(1).returns({
      exclTaxes: 45,
      inclTaxes: 50,
      hours: 6,
      eventsList: [events[0], events[1]],
    });
    formatDraftBillsForCustomer.onCall(2).returns({ exclTaxes: 60, inclTaxes: 75, hours: 8, eventsList: events });
    formatDraftBillsForTPP.onCall(0).returns({
      [fundings[0]._id]: { exclTaxes: 21, inclTaxes: 23, hours: 2, eventsList: [events[1]] },
    });
    formatDraftBillsForTPP.onCall(1).returns({
      [fundings[0]._id]: { exclTaxes: 42, inclTaxes: 46, hours: 4, eventsList: [events[1], events[2]] },
    });

    const result = DraftBillsHelper.computeBillingInfoForEvents(events, service, fundings, startDate, 12);

    expect(result).toEqual({
      prices: {
        customerPrices: { exclTaxes: 60, inclTaxes: 75, hours: 8, eventsList: events },
        thirdPartyPayerPrices: {
          [fundings[0]._id]: { exclTaxes: 42, inclTaxes: 46, hours: 4, eventsList: [events[1], events[2]] },
        },
        startDate,
      },
      eventsByBillingItem: {
        d00000000000000000000000: [
          { _id: events[0]._id, startDate: '2021-03-04T12:00:00.000Z' },
          { _id: events[1]._id, startDate: '2021-03-05T10:00:00.000Z' },
          { _id: events[2]._id, startDate: '2021-03-06T10:00:00.000Z' },
        ],
      },
    });
    sinon.assert.calledWithExactly(getMatchingVersion.getCall(0), events[0].startDate, service, 'startDate');
    sinon.assert.calledWithExactly(getMatchingVersion.getCall(1), events[1].startDate, service, 'startDate');
    sinon.assert.calledWithExactly(getMatchingVersion.getCall(2), events[2].startDate, service, 'startDate');
    sinon.assert.calledWithExactly(getMatchingFunding.getCall(0), events[0].startDate, fundings);
    sinon.assert.calledWithExactly(getMatchingFunding.getCall(1), events[1].startDate, fundings);
    sinon.assert.calledWithExactly(getMatchingFunding.getCall(2), events[2].startDate, fundings);
    sinon.assert.calledWithExactly(getEventBilling.getCall(0), events[0], 12, matchingService, null);
    sinon.assert.calledWithExactly(getEventBilling.getCall(1), events[1], 12, matchingService, matchingFunding);
    sinon.assert.calledWithExactly(getEventBilling.getCall(2), events[2], 12, matchingService, matchingFunding);
    sinon.assert.calledWithExactly(
      formatDraftBillsForCustomer.getCall(0),
      { exclTaxes: 0, inclTaxes: 0, hours: 0, eventsList: [] },
      events[0],
      { customerPrice: 20 },
      matchingService
    );
    sinon.assert.calledWithExactly(
      formatDraftBillsForCustomer.getCall(1),
      { exclTaxes: 12, inclTaxes: 15, hours: 2, eventsList: [events[0]] },
      events[1],
      { customerPrice: 15, thirdPartyPayerPrice: 12 },
      matchingService
    );
    sinon.assert.calledWithExactly(
      formatDraftBillsForCustomer.getCall(2),
      { exclTaxes: 45, inclTaxes: 50, hours: 6, eventsList: [events[0], events[1]] },
      events[2],
      { customerPrice: 17, thirdPartyPayerPrice: 15 },
      matchingService
    );
    sinon.assert.calledWithExactly(
      formatDraftBillsForTPP.getCall(0),
      {},
      'tpp',
      events[1],
      { customerPrice: 15, thirdPartyPayerPrice: 12 },
      matchingService
    );
    sinon.assert.calledWithExactly(
      formatDraftBillsForTPP.getCall(1),
      { [fundings[0]._id]: { exclTaxes: 21, inclTaxes: 23, hours: 2, eventsList: [events[1]] } },
      'tpp',
      events[2],
      { customerPrice: 17, thirdPartyPayerPrice: 15 },
      matchingService
    );
  });

  it('should return empty infos if no event', () => {
    const startDate = moment('2021/01/01', 'YYYY/MM/DD');

    const result = DraftBillsHelper.computeBillingInfoForEvents([], { _id: new ObjectId() }, [], startDate, 0);

    expect(result).toEqual({
      prices: {
        customerPrices: { exclTaxes: 0, inclTaxes: 0, hours: 0, eventsList: [] },
        thirdPartyPayerPrices: {},
        startDate,
      },
      eventsByBillingItem: {},
    });
    sinon.assert.notCalled(getMatchingVersion);
    sinon.assert.notCalled(getMatchingFunding);
    sinon.assert.notCalled(getEventBilling);
    sinon.assert.notCalled(formatDraftBillsForCustomer);
    sinon.assert.notCalled(formatDraftBillsForTPP);
  });
});

describe('formatDraftBillsForTPP', () => {
  let getExclTaxes;
  beforeEach(() => {
    getExclTaxes = sinon.stub(UtilsHelper, 'getExclTaxes');
  });
  afterEach(() => {
    getExclTaxes.restore();
  });

  it('should format bill for tpp', () => {
    const tppId = new ObjectId();
    const tpp = { _id: tppId };
    const tppPrices = { [tppId]: { exclTaxes: 20, inclTaxes: 25, hours: 3, eventsList: [{ event: '123456' }] } };
    const event = { _id: 'abc', startDate: '2019-02-12T08:00:00.000Z', endDate: '2019-02-12T10:00:00.000Z' };
    const eventPrice = {
      customerPrice: 21,
      thirdPartyPayerPrice: 12.5,
      thirdPartyPayer: tppId,
      history: {},
      chargedTime: 120,
    };
    const service = { vat: 20 };
    getExclTaxes.onCall(0).returns(10);
    getExclTaxes.onCall(1).returns(17.5);

    const result = DraftBillsHelper.formatDraftBillsForTPP(tppPrices, tpp, event, eventPrice, service);

    expect(result[tppId].exclTaxes).toEqual(30);
    expect(result[tppId].inclTaxes).toEqual(37.5);
    expect(result[tppId].hours).toEqual(5);
    expect(result[tppId].eventsList).toMatchObject([
      { event: '123456' },
      {
        event: 'abc',
        inclTaxesTpp: 12.5,
        exclTaxesTpp: 10,
        thirdPartyPayer: tppId,
        inclTaxesCustomer: 21,
        exclTaxesCustomer: 17.5,
      },
    ]);
  });
});

describe('getDraftBillsPerSubscription', () => {
  let getLastVersion;
  let getMatchingVersion;
  let getExclTaxes;
  let computeBillingInfoForEvents;
  beforeEach(() => {
    getLastVersion = sinon.stub(UtilsHelper, 'getLastVersion');
    getMatchingVersion = sinon.stub(UtilsHelper, 'getMatchingVersion');
    getExclTaxes = sinon.stub(UtilsHelper, 'getExclTaxes');
    computeBillingInfoForEvents = sinon.stub(DraftBillsHelper, 'computeBillingInfoForEvents');
  });
  afterEach(() => {
    getLastVersion.restore();
    getMatchingVersion.restore();
    getExclTaxes.restore();
    computeBillingInfoForEvents.restore();
  });

  it('should return draft bill', () => {
    const tppId = new ObjectId();
    const fundings = [{ thirdPartyPayer: { _id: tppId } }];
    const events = [
      { _id: 1, startDate: new Date('2019/02/15').setHours(8), endDate: new Date('2019/02/15').setHours(10) },
    ];
    const subscription = {
      versions: [{ startDate: new Date('2019/01/01'), unitTTCRate: 21 }],
      service: {
        versions: [
          { startDate: new Date('2019/01/01'), vat: 20, billingItems: [new ObjectId('d00000000000000000000001')] },
        ],
      },
    };

    getLastVersion.returns({ startDate: new Date('2019/01/01'), unitTTCRate: 21 });
    getMatchingVersion.returns({ startDate: new Date('2019/01/01'), vat: 20 });
    getExclTaxes.returns(70);
    computeBillingInfoForEvents.returns({
      prices: {
        customerPrices: { exclTaxes: 35 },
        thirdPartyPayerPrices: { [tppId]: { hours: 3 } },
        startDate: moment('2019/02/01', 'YY/MM/DD'),
      },
      eventsByBillingItem: [{ d00000000000000000000001: [events[0]._id] }],
    });

    const result =
      DraftBillsHelper.getDraftBillsPerSubscription(events, subscription, fundings, '2019/02/01', '2019/03/01');

    expect(result.customer.exclTaxes).toEqual(35);
    expect(result.customer.unitExclTaxes).toEqual(70);
    expect(result.customer.unitInclTaxes).toEqual(21);
    expect(result.thirdPartyPayer[tppId].hours).toEqual(3);
    expect(result.eventsByBillingItem).toEqual([{ d00000000000000000000001: [events[0]._id] }]);
    sinon.assert.calledOnceWithExactly(
      getLastVersion,
      [{ startDate: new Date('2019/01/01'), unitTTCRate: 21 }],
      'createdAt'
    );
    sinon.assert.calledOnceWithExactly(getMatchingVersion, '2019/03/01', subscription.service, 'startDate');
    sinon.assert.calledOnceWithExactly(getExclTaxes, 21, 20);
    sinon.assert.calledOnceWithExactly(
      computeBillingInfoForEvents,
      events,
      subscription.service,
      fundings,
      '2019/02/01',
      21
    );
  });

  it('should return draft bill for customer only', () => {
    const events = [
      { _id: 1, startDate: new Date('2019/02/15').setHours(8), endDate: new Date('2019/02/15').setHours(10) },
    ];
    const subscription = {
      versions: [{ startDate: new Date('2019/01/01'), unitTTCRate: 21 }],
      service: { versions: [{ startDate: new Date('2019/01/01'), vat: 20 }] },
    };

    getLastVersion.returns({ startDate: new Date('2019/01/01'), unitTTCRate: 21 });
    getMatchingVersion.returns({ startDate: new Date('2019/01/01'), vat: 20 });
    getExclTaxes.returns(70);
    computeBillingInfoForEvents.returns({
      prices: { customerPrices: { exclTaxes: 35 }, startDate: moment('2019/02/01', 'YY/MM/DD') },
      eventsByBillingItem: [],
    });

    const result =
      DraftBillsHelper.getDraftBillsPerSubscription(events, subscription, null, '2019/02/01', '2019/03/01');

    expect(result.customer.exclTaxes).toEqual(35);
    expect(result.customer.unitExclTaxes).toEqual(70);
    expect(result.customer.unitInclTaxes).toEqual(21);
    expect(result.eventsByBillingItem).toEqual([]);
    sinon.assert.calledOnceWithExactly(
      getLastVersion,
      [{ startDate: new Date('2019/01/01'), unitTTCRate: 21 }],
      'createdAt'
    );
    sinon.assert.calledOnceWithExactly(getMatchingVersion, '2019/03/01', subscription.service, 'startDate');
    sinon.assert.calledOnceWithExactly(getExclTaxes, 21, 20);
    sinon.assert.calledOnceWithExactly(
      computeBillingInfoForEvents,
      events,
      subscription.service,
      null,
      '2019/02/01',
      21
    );
  });

  it('should return draft bill for tpp only', () => {
    const tppId = new ObjectId();
    const fundings = [{ thirdPartyPayer: { _id: tppId } }];
    const events = [
      { _id: 1, startDate: new Date('2019/02/15').setHours(8), endDate: new Date('2019/02/15').setHours(10) },
    ];
    const subscription = {
      versions: [{ startDate: new Date('2019/01/01'), unitTTCRate: 21 }],
      service: { versions: [{ startDate: new Date('2019/01/01'), vat: 20 }] },
    };

    getLastVersion.returns({ startDate: new Date('2019/01/01'), unitTTCRate: 21 });
    getMatchingVersion.returns({ startDate: new Date('2019/01/01'), vat: 20 });
    getExclTaxes.returns(70);
    computeBillingInfoForEvents.returns({
      prices: {
        customerPrices: { exclTaxes: 0 },
        thirdPartyPayerPrices: { [tppId]: { hours: 3 } },
        startDate: moment('2019/02/01', 'YY/MM/DD'),
      },
      eventsByBillingItem: [],
    });

    const result =
      DraftBillsHelper.getDraftBillsPerSubscription(events, subscription, fundings, '2019/02/01', '2019/03/01');

    expect(result.customer).toBeUndefined();
    expect(result.thirdPartyPayer[tppId].hours).toEqual(3);
    expect(result.eventsByBillingItem).toEqual([]);
    sinon.assert.calledOnceWithExactly(
      getLastVersion,
      [{ startDate: new Date('2019/01/01'), unitTTCRate: 21 }],
      'createdAt'
    );
    sinon.assert.calledOnceWithExactly(getMatchingVersion, '2019/03/01', subscription.service, 'startDate');
    sinon.assert.calledOnceWithExactly(getExclTaxes, 21, 20);
    sinon.assert.calledOnceWithExactly(
      computeBillingInfoForEvents,
      events,
      subscription.service,
      fundings,
      '2019/02/01',
      21
    );
  });
});

describe('formatBillingItems', () => {
  let findOne;

  beforeEach(() => {
    findOne = sinon.stub(BillingItem, 'findOne');
  });
  afterEach(() => {
    findOne.restore();
  });

  it('should return formatted billing items', async () => {
    const eventId1 = new ObjectId();
    const eventId2 = new ObjectId();
    const eventId3 = new ObjectId();
    const eventsByBillingItemBySubscriptions = [
      {
        d00000000000000000000001: [{ _id: eventId1, fieldToOmit: 'test' }, { _id: eventId2 }],
        d00000000000000000000002: [{ _id: eventId1 }, { _id: eventId2 }],
      },
      { d00000000000000000000001: [{ _id: eventId3 }] },
    ];
    const endDate = '2019-12-25T07:00:00';
    const billingStartDate = '2019-12-31T07:00:00';
    const billingItem1 = {
      _id: 'd00000000000000000000001',
      name: 'FI',
      type: 'per_intervention',
      defaultUnitAmount: 1,
      vat: 10,
    };
    const billingItem2 = {
      _id: 'd00000000000000000000002',
      name: 'EPI',
      type: 'per_intervention',
      defaultUnitAmount: 5,
      vat: 10,
    };
    const bddBillingItems = [billingItem1, billingItem2, billingItem1];
    const subscriptionsDraftBills = [
      { eventsList: [{ event: eventId1 }, { event: eventId2 }] },
      { eventsList: [{ event: eventId3 }] },
    ];

    const result = await DraftBillsHelper.formatBillingItems(
      eventsByBillingItemBySubscriptions,
      bddBillingItems,
      billingStartDate,
      endDate,
      subscriptionsDraftBills
    );

    expect(result).toEqual([
      expect.objectContaining({
        billingItem: { _id: new ObjectId('d00000000000000000000001'), name: 'FI' },
        discount: 0,
        unitExclTaxes: 0.9090909090909091,
        unitInclTaxes: 1,
        vat: 10,
        eventsList: [{ event: eventId1 }, { event: eventId2 }, { event: eventId3 }],
        exclTaxes: 2.727272727272727,
        inclTaxes: 3,
        startDate: '2019-12-31T07:00:00',
        endDate: '2019-12-25T07:00:00',
      }),
      expect.objectContaining({
        billingItem: { _id: new ObjectId('d00000000000000000000002'), name: 'EPI' },
        discount: 0,
        unitExclTaxes: 4.545454545454546,
        unitInclTaxes: 5,
        vat: 10,
        eventsList: [{ event: eventId1 }, { event: eventId2 }],
        exclTaxes: 9.090909090909092,
        inclTaxes: 10,
        startDate: '2019-12-31T07:00:00',
        endDate: '2019-12-25T07:00:00',
      }),
    ]);
  });
});

describe('formatCustomerBills', () => {
  it('should format customer bills', () => {
    const customerBills = [{ inclTaxes: 20 }, { inclTaxes: 21 }];
    const tppBills = [];
    const query = { endDate: '2019-12-25T07:00:00' };
    const customer = { _id: 'ghjk', identity: { firstname: 'Toto' } };

    const result = DraftBillsHelper.formatCustomerBills(customerBills, tppBills, query, customer);

    expect(result).toEqual({
      customer: { _id: 'ghjk', identity: { firstname: 'Toto' } },
      endDate: '2019-12-25T07:00:00',
      customerBills: { bills: [{ inclTaxes: 20 }, { inclTaxes: 21 }], total: 41 },
    });
  });

  it('should format customer and tpp bills', () => {
    const customerBills = [{ inclTaxes: 20 }, { inclTaxes: 21 }];
    const tppBills = { tpp1: [{ inclTaxes: 13 }, { inclTaxes: 24 }], tpp2: [{ inclTaxes: 20 }] };
    const query = { endDate: '2019-12-25T07:00:00' };
    const customer = { _id: 'ghjk', identity: { firstname: 'Toto' } };

    const result = DraftBillsHelper.formatCustomerBills(customerBills, tppBills, query, customer);

    expect(result).toEqual({
      customer: { _id: 'ghjk', identity: { firstname: 'Toto' } },
      endDate: '2019-12-25T07:00:00',
      customerBills: { bills: [{ inclTaxes: 20 }, { inclTaxes: 21 }], total: 41 },
      thirdPartyPayerBills: [
        { bills: [{ inclTaxes: 13 }, { inclTaxes: 24 }], total: 37 },
        { bills: [{ inclTaxes: 20 }], total: 20 },
      ],
    });
  });
});

describe('getDraftBillsList', () => {
  let findThirdPartyPayer;
  let getEventsToBill;
  let populateAndFormatSubscription;
  let populateFundings;
  let getDraftBillsPerSubscription;
  let findSurcharge;
  let findBillingItem;
  let formatBillingItems;
  let formatCustomerBills;

  beforeEach(() => {
    findThirdPartyPayer = sinon.stub(ThirdPartyPayer, 'find');
    getEventsToBill = sinon.stub(EventRepository, 'getEventsToBill');
    populateAndFormatSubscription = sinon.stub(DraftBillsHelper, 'populateAndFormatSubscription');
    populateFundings = sinon.stub(DraftBillsHelper, 'populateFundings');
    getDraftBillsPerSubscription = sinon.stub(DraftBillsHelper, 'getDraftBillsPerSubscription');
    findSurcharge = sinon.stub(Surcharge, 'find');
    findBillingItem = sinon.stub(BillingItem, 'find');
    formatBillingItems = sinon.stub(DraftBillsHelper, 'formatBillingItems');
    formatCustomerBills = sinon.stub(DraftBillsHelper, 'formatCustomerBills');
  });
  afterEach(() => {
    findThirdPartyPayer.restore();
    getEventsToBill.restore();
    populateAndFormatSubscription.restore();
    populateFundings.restore();
    getDraftBillsPerSubscription.restore();
    findSurcharge.restore();
    findBillingItem.restore();
    formatBillingItems.restore();
    formatCustomerBills.restore();
  });

  it('should return empty array if not event to bill', async () => {
    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId } };
    const bddSurcharges = [{ _id: new ObjectId(), sundaySurcharge: 10 }];
    const bddBillingItems = [{ _id: new ObjectId(), defaultUnitAmount: 2 }];
    const query = { endDate: '2019-12-25T07:00:00', billingStartDate: '2019-12-31T07:00:00' };

    getEventsToBill.returns([]);
    findThirdPartyPayer.returns(SinonMongoose.stubChainedQueries(null, ['lean']));
    findSurcharge.returns(SinonMongoose.stubChainedQueries(bddSurcharges, ['lean']));
    findBillingItem.returns(SinonMongoose.stubChainedQueries(bddBillingItems, ['lean']));
    formatBillingItems.returns([]);

    const result = await DraftBillsHelper.getDraftBillsList(query, credentials);

    expect(result).toEqual([]);
    SinonMongoose.calledOnceWithExactly(
      findThirdPartyPayer,
      [{ query: 'find', args: [{ company: companyId }] }, { query: 'lean' }]
    );
    SinonMongoose.calledOnceWithExactly(
      findSurcharge,
      [{ query: 'find', args: [{ company: companyId }] }, { query: 'lean' }]
    );
    SinonMongoose.calledOnceWithExactly(
      findBillingItem,
      [{ query: 'find', args: [{ company: companyId }] }, { query: 'lean' }]
    );
    sinon.assert.calledWithExactly(getEventsToBill, query, credentials.company._id);
    sinon.assert.notCalled(populateAndFormatSubscription);
    sinon.assert.notCalled(populateFundings);
    sinon.assert.notCalled(getDraftBillsPerSubscription);
    sinon.assert.notCalled(formatCustomerBills);
  });

  it('should return customer and tpp draft bills', async () => {
    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId } };
    const thirdPartyPayersList = [{ id: new ObjectId() }];
    const bddSurcharges = [{ _id: new ObjectId(), sundaySurcharge: 10 }];
    const bddBillingItems = [{ _id: new ObjectId(), defaultUnitAmount: 2 }];
    const query = { endDate: '2019-12-25T07:00:00', billingStartDate: '2019-12-31T07:00:00' };

    findThirdPartyPayer.returns(SinonMongoose.stubChainedQueries(thirdPartyPayersList, ['lean']));
    findSurcharge.returns(SinonMongoose.stubChainedQueries(bddSurcharges, ['lean']));
    findBillingItem.returns(SinonMongoose.stubChainedQueries(bddBillingItems, ['lean']));
    getEventsToBill.returns([
      {
        customer: { _id: 'ghjk', identity: { firstname: 'Toto' } },
        eventsBySubscriptions: [
          {
            subscription: { _id: '1234567890' },
            events: [{ type: 'intervention', _id: '1234' }],
            fundings: [{ nature: 'hourly' }],
          },
          {
            subscription: { _id: '0987654321' },
            events: [{ type: 'intervention', _id: '5678' }],
            fundings: [{ nature: 'fixed' }],
          },
        ],
      },
    ]);
    populateAndFormatSubscription.returnsArg(0);
    populateFundings.returnsArg(0);
    getDraftBillsPerSubscription.onCall(0).returns({
      customer: { identity: { firstname: 'Toto' }, inclTaxes: 20 },
      thirdPartyPayer: { tpp: { inclTaxes: 13 } },
      billingItems: [],
    });
    getDraftBillsPerSubscription.onCall(1).returns({
      customer: { identity: { firstname: 'Toto' }, inclTaxes: 21 },
      thirdPartyPayer: { tpp: { inclTaxes: 24 } },
      billingItems: [],
    });
    formatBillingItems.returns([]);
    formatCustomerBills.returns({
      customer: { _id: 'ghjk', identity: { firstname: 'Toto' } },
      endDate: '2019-12-25T07:00:00',
      customerBills: {
        bills: [
          { identity: { firstname: 'Toto' }, inclTaxes: 20 },
          { identity: { firstname: 'Toto' }, inclTaxes: 21 },
        ],
        total: 41,
      },
      thirdPartyPayerBills: [{ bills: [{ inclTaxes: 13 }, { inclTaxes: 24 }], total: 37 }],
    });

    const result = await DraftBillsHelper.getDraftBillsList(query, credentials, null);

    expect(result).toEqual([
      {
        customer: { _id: 'ghjk', identity: { firstname: 'Toto' } },
        endDate: '2019-12-25T07:00:00',
        customerBills: {
          bills: [
            { identity: { firstname: 'Toto' }, inclTaxes: 20 },
            { identity: { firstname: 'Toto' }, inclTaxes: 21 },
          ],
          total: 41,
        },
        thirdPartyPayerBills: [{ bills: [{ inclTaxes: 13 }, { inclTaxes: 24 }], total: 37 }],
      },
    ]);
    sinon.assert.calledWithExactly(getEventsToBill, query, credentials.company._id);
    sinon.assert.calledWithExactly(
      populateAndFormatSubscription.firstCall,
      { _id: '1234567890' },
      bddSurcharges,
      bddBillingItems
    );
    sinon.assert.calledWithExactly(
      populateAndFormatSubscription.secondCall,
      { _id: '0987654321' },
      bddSurcharges,
      bddBillingItems
    );
    sinon.assert.calledWithExactly(
      populateFundings.firstCall,
      [{ nature: 'hourly' }],
      '2019-12-25T07:00:00',
      thirdPartyPayersList,
      companyId
    );
    sinon.assert.calledWithExactly(
      populateFundings.secondCall,
      [{ nature: 'fixed' }],
      '2019-12-25T07:00:00',
      thirdPartyPayersList,
      companyId
    );
    sinon.assert.calledWithExactly(
      getDraftBillsPerSubscription.firstCall,
      [{ type: 'intervention', _id: '1234' }],
      { _id: '1234567890' },
      [{ nature: 'hourly' }],
      '2019-12-31T07:00:00',
      '2019-12-25T07:00:00'
    );
    sinon.assert.calledWithExactly(
      getDraftBillsPerSubscription.secondCall,
      [{ type: 'intervention', _id: '5678' }],
      { _id: '0987654321' },
      [{ nature: 'fixed' }],
      '2019-12-31T07:00:00',
      '2019-12-25T07:00:00'
    );
    sinon.assert.calledOnceWithExactly(
      formatCustomerBills,
      [{ identity: { firstname: 'Toto' }, inclTaxes: 20 }, { identity: { firstname: 'Toto' }, inclTaxes: 21 }],
      { tpp: [{ inclTaxes: 13 }, { inclTaxes: 24 }] },
      query,
      { _id: 'ghjk', identity: { firstname: 'Toto' } }
    );
    SinonMongoose.calledOnceWithExactly(
      findThirdPartyPayer,
      [{ query: 'find', args: [{ company: companyId }] }, { query: 'lean' }]
    );
    SinonMongoose.calledOnceWithExactly(
      findSurcharge,
      [{ query: 'find', args: [{ company: companyId }] }, { query: 'lean' }]
    );
    SinonMongoose.calledOnceWithExactly(
      findBillingItem,
      [{ query: 'find', args: [{ company: companyId }] }, { query: 'lean' }]
    );
  });

  it('should return customer draft bills', async () => {
    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId } };
    const bddSurcharges = [{ _id: new ObjectId(), sundaySurcharge: 10 }];
    const bddBillingItems = [{ _id: new ObjectId(), defaultUnitAmount: 2 }];
    const query = { endDate: '2019-12-25T07:00:00', billingStartDate: '2019-12-31T07:00:00' };

    findThirdPartyPayer.returns(SinonMongoose.stubChainedQueries(null, ['lean']));
    findSurcharge.returns(SinonMongoose.stubChainedQueries(bddSurcharges, ['lean']));
    findBillingItem.returns(SinonMongoose.stubChainedQueries(bddBillingItems, ['lean']));
    getEventsToBill.returns([
      {
        customer: { _id: 'ghjk', identity: { firstname: 'Toto' } },
        eventsBySubscriptions: [
          {
            subscription: { _id: '1234567890', service: { versions: [{ billingItems: ['biId1'] }] } },
            events: [{ type: 'intervention', _id: 'eventId1' }],
          },
          {
            subscription: { _id: '0987654321', service: { versions: [{ billingItems: ['biId2'] }] } },
            events: [{ type: 'intervention', _id: 'eventId2' }],
          },
        ],
      },
      {
        customer: { _id: 'asdf', identity: { firstname: 'Tata' } },
        eventsBySubscriptions: [
          { subscription: { _id: 'qwertyuiop' }, events: [{ type: 'intervention', _id: '9876' }] },
        ],
      },
    ]);
    populateAndFormatSubscription.returnsArg(0);
    getDraftBillsPerSubscription.onCall(0).returns({
      customer: { identity: { firstname: 'Toto' }, inclTaxes: 20 },
      billingItems: { biId1: ['eventId1'] },
    });
    getDraftBillsPerSubscription.onCall(1).returns({
      customer: { identity: { firstname: 'Toto' }, inclTaxes: 21 },
      billingItems: { biId2: ['eventId2'] },
    });
    getDraftBillsPerSubscription.onCall(2).returns({
      customer: { identity: { firstname: 'Tata' }, inclTaxes: 23 },
      billingItems: [],
    });
    formatBillingItems.onCall(0).returns([
      { billingItem: { _id: 'biId1', name: 'FI' }, eventsList: [{ event: 'eventId1' }], inclTaxes: 200 },
      { billingItem: { _id: 'biId2', name: 'EPI' }, eventsList: [{ event: 'eventId2' }], inclTaxes: 100 },
    ]);
    formatBillingItems.onCall(1).returns([]);
    formatCustomerBills.onCall(0).returns({
      customer: { _id: 'ghjk', identity: { firstname: 'Toto' } },
      endDate: '2019-12-25T07:00:00',
      customerBills: {
        bills: [
          { identity: { firstname: 'Toto' }, inclTaxes: 20 },
          { identity: { firstname: 'Toto' }, inclTaxes: 21 },
          { billingItem: { _id: 'biId1', name: 'FI' }, eventsList: [{ event: 'eventId1' }], inclTaxes: 200 },
          { billingItem: { _id: 'biId2', name: 'EPI' }, eventsList: [{ event: 'eventId2' }], inclTaxes: 100 },
        ],
        total: 341,
      },
    });
    formatCustomerBills.onCall(1).returns({
      endDate: '2019-12-25T07:00:00',
      customer: { _id: 'asdf', identity: { firstname: 'Tata' } },
      customerBills: {
        bills: [
          { identity: { firstname: 'Tata' }, inclTaxes: 23 },
        ],
        total: 23,
      },
    });

    const result = await DraftBillsHelper.getDraftBillsList(query, credentials, null);

    expect(result).toEqual([
      {
        customer: { _id: 'ghjk', identity: { firstname: 'Toto' } },
        endDate: '2019-12-25T07:00:00',
        customerBills: {
          bills: [
            { identity: { firstname: 'Toto' }, inclTaxes: 20 },
            { identity: { firstname: 'Toto' }, inclTaxes: 21 },
            { billingItem: { _id: 'biId1', name: 'FI' }, eventsList: [{ event: 'eventId1' }], inclTaxes: 200 },
            { billingItem: { _id: 'biId2', name: 'EPI' }, eventsList: [{ event: 'eventId2' }], inclTaxes: 100 },
          ],
          total: 341,
        },
      },
      {
        endDate: '2019-12-25T07:00:00',
        customer: { _id: 'asdf', identity: { firstname: 'Tata' } },
        customerBills: {
          bills: [
            { identity: { firstname: 'Tata' }, inclTaxes: 23 },
          ],
          total: 23,
        },
      },
    ]);
    sinon.assert.calledWithExactly(getEventsToBill, query, credentials.company._id);
    sinon.assert.calledWithExactly(
      populateAndFormatSubscription.firstCall,
      { _id: '1234567890', service: { versions: [{ billingItems: ['biId1'] }] } },
      bddSurcharges,
      bddBillingItems
    );
    sinon.assert.calledWithExactly(
      populateAndFormatSubscription.secondCall,
      { _id: '0987654321', service: { versions: [{ billingItems: ['biId2'] }] } },
      bddSurcharges,
      bddBillingItems
    );
    sinon.assert.calledWithExactly(
      populateAndFormatSubscription.thirdCall,
      { _id: 'qwertyuiop' },
      bddSurcharges,
      bddBillingItems
    );
    sinon.assert.notCalled(populateFundings);
    sinon.assert.calledWithExactly(
      getDraftBillsPerSubscription.firstCall,
      [{ type: 'intervention', _id: 'eventId1' }],
      { _id: '1234567890', service: { versions: [{ billingItems: ['biId1'] }] } },
      null,
      '2019-12-31T07:00:00',
      '2019-12-25T07:00:00'
    );
    sinon.assert.calledWithExactly(
      getDraftBillsPerSubscription.secondCall,
      [{ type: 'intervention', _id: 'eventId2' }],
      { _id: '0987654321', service: { versions: [{ billingItems: ['biId2'] }] } },
      null,
      '2019-12-31T07:00:00',
      '2019-12-25T07:00:00'
    );
    sinon.assert.calledWithExactly(
      getDraftBillsPerSubscription.thirdCall,
      [{ type: 'intervention', _id: '9876' }],
      { _id: 'qwertyuiop' },
      null,
      '2019-12-31T07:00:00',
      '2019-12-25T07:00:00'
    );
    sinon.assert.calledWithExactly(
      formatCustomerBills.firstCall,
      [
        { identity: { firstname: 'Toto' }, inclTaxes: 20 },
        { identity: { firstname: 'Toto' }, inclTaxes: 21 },
        { billingItem: { _id: 'biId1', name: 'FI' }, eventsList: [{ event: 'eventId1' }], inclTaxes: 200 },
        { billingItem: { _id: 'biId2', name: 'EPI' }, eventsList: [{ event: 'eventId2' }], inclTaxes: 100 },
      ],
      {},
      query,
      { _id: 'ghjk', identity: { firstname: 'Toto' } }
    );
    sinon.assert.calledWithExactly(
      formatCustomerBills.secondCall,
      [{ identity: { firstname: 'Tata' }, inclTaxes: 23 }],
      {},
      query,
      { _id: 'asdf', identity: { firstname: 'Tata' } }
    );
    SinonMongoose.calledOnceWithExactly(
      findThirdPartyPayer,
      [{ query: 'find', args: [{ company: companyId }] }, { query: 'lean' }]
    );
    SinonMongoose.calledOnceWithExactly(
      findSurcharge,
      [{ query: 'find', args: [{ company: companyId }] }, { query: 'lean' }]
    );
    SinonMongoose.calledOnceWithExactly(
      findBillingItem,
      [{ query: 'find', args: [{ company: companyId }] }, { query: 'lean' }]
    );
  });
});
