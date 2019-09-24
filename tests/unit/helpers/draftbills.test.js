const sinon = require('sinon');
const expect = require('expect');
const moment = require('moment');
const { ObjectID } = require('mongodb');
const omit = require('lodash/omit');
require('sinon-mongoose');

const Surcharge = require('../../../src/models/Surcharge');
const ThirdPartyPayer = require('../../../src/models/ThirdPartyPayer');
const FundingHistory = require('../../../src/models/FundingHistory');
const DraftBillsHelper = require('../../../src/helpers/draftBills');
const UtilsHelper = require('../../../src/helpers/utils');
const SurchargesHelper = require('../../../src/helpers/surcharges');
const EventRepository = require('../../../src/repositories/EventRepository');

describe('populateSurcharge', () => {
  let findOne;
  beforeEach(() => {
    findOne = sinon.stub(Surcharge, 'findOne');
  });
  afterEach(() => {
    findOne.restore();
  });

  it('should populate surcharge and order versions', async () => {
    const surchargeId = new ObjectID();
    const returnedSurcharge = { _id: surchargeId, sundaySurcharge: 10 };
    const subscription = {
      _id: 'abc',
      versions: [
        { unitTTCRate: 13, startDate: new Date('2019-01-20'), _id: 5 },
        { unitTTCRate: 15, startDate: new Date('2019-02-24'), _id: 4 },
      ],
      service: {
        versions: [
          { startDate: new Date('2019-02-24'), _id: 1 },
          { surcharge: surchargeId, startDate: new Date('2019-03-20'), _id: 2 },
          { surcharge: surchargeId, startDate: new Date('2019-02-29'), _id: 3 },
        ],
      },
    };
    findOne.returns(returnedSurcharge);

    const result = await DraftBillsHelper.populateSurcharge(subscription);

    expect(result).toBeDefined();
    expect(result._id).toEqual('abc');
    expect(result.versions.length).toEqual(2);
    expect(result.versions[0]._id).toEqual(4);
    expect(result.service.versions.length).toEqual(3);
    expect(result.service.versions[0]._id).toEqual(2);
    sinon.assert.callCount(findOne, 2);
  });
});

describe('populateFundings', () => {
  let ThirdPartyPayerMock = null;
  let FundingHistoryMock = null;
  beforeEach(() => {
    ThirdPartyPayerMock = sinon.mock(ThirdPartyPayer);
    FundingHistoryMock = sinon.mock(FundingHistory);
  });
  afterEach(() => {
    ThirdPartyPayerMock.restore();
    FundingHistoryMock.restore();
  });

  it('should return empty array if input empty', async () => {
    const result = await DraftBillsHelper.populateFundings([], new Date());
    expect(result).toEqual([]);
  });

  it('should populate third party payer funding', async () => {
    const tppId = new ObjectID();
    const fundings = [{ thirdPartyPayer: tppId, _id: new ObjectID(), versions: [] }];
    const returnedTpp = { _id: tppId };
    const funding = { ...omit(fundings[0], ['versions']) };
    const mergeLastVersionWithBaseObjectStub = sinon.stub(UtilsHelper, 'mergeLastVersionWithBaseObject').returns(funding);

    ThirdPartyPayerMock
      .expects('findOne')
      .withArgs({ _id: fundings[0].thirdPartyPayer })
      .chain('lean')
      .resolves(returnedTpp);

    FundingHistoryMock
      .expects('findOne')
      .withArgs({ fundingId: fundings[0]._id })
      .chain('lean')
      .resolves(null);

    const result = await DraftBillsHelper.populateFundings(fundings, new Date());

    expect(result).toBeDefined();
    expect(result[0].thirdPartyPayer).toBeDefined();
    expect(result[0].thirdPartyPayer._id).toEqual(tppId);
    sinon.assert.called(mergeLastVersionWithBaseObjectStub);
    mergeLastVersionWithBaseObjectStub.restore();
    ThirdPartyPayerMock.verify();
    FundingHistoryMock.verify();
  });

  it('should populate funding history with once frequency and history', async () => {
    const fundingId = new ObjectID();
    const fundings = [{
      _id: new ObjectID(),
      thirdPartyPayer: new ObjectID(),
      versions: [{ frequency: 'once', _id: fundingId }],
    }];
    const funding = { ...fundings[0].versions[0], ...omit(fundings[0], ['versions']) };
    const returnedHistory = { careHours: 4, fundingId };
    const mergeLastVersionWithBaseObjectStub = sinon.stub(UtilsHelper, 'mergeLastVersionWithBaseObject').returns(funding);

    ThirdPartyPayerMock
      .expects('findOne')
      .withArgs({ _id: fundings[0].thirdPartyPayer })
      .chain('lean')
      .resolves(null);

    FundingHistoryMock
      .expects('findOne')
      .withArgs({ fundingId: fundings[0]._id })
      .chain('lean')
      .resolves(returnedHistory);

    const result = await DraftBillsHelper.populateFundings(fundings, new Date());

    expect(result).toBeDefined();
    expect(result[0].history).toBeDefined();
    expect(result[0].history).toMatchObject({ careHours: 4, fundingId });
    sinon.assert.called(mergeLastVersionWithBaseObjectStub);
    mergeLastVersionWithBaseObjectStub.restore();
    ThirdPartyPayerMock.verify();
    FundingHistoryMock.verify();
  });

  it('should populate funding history with once frequency and without history', async () => {
    const fundingId = new ObjectID();
    const fundings = [{
      _id: fundingId,
      thirdPartyPayer: new ObjectID(),
      versions: [{ frequency: 'once', _id: fundingId }],
    }];
    const funding = { ...fundings[0].versions[0], ...omit(fundings[0], ['versions']) };
    const mergeLastVersionWithBaseObjectStub = sinon.stub(UtilsHelper, 'mergeLastVersionWithBaseObject').returns(funding);

    ThirdPartyPayerMock
      .expects('findOne')
      .withArgs({ _id: fundings[0].thirdPartyPayer })
      .chain('lean')
      .resolves(null);

    FundingHistoryMock
      .expects('findOne')
      .withArgs({ fundingId: fundings[0]._id })
      .chain('lean')
      .resolves(null);

    const result = await DraftBillsHelper.populateFundings(fundings, new Date());

    expect(result).toBeDefined();
    expect(result[0].history).toBeDefined();
    expect(result[0].history).toMatchObject({ careHours: 0, amountTTC: 0, fundingId });
    sinon.assert.called(mergeLastVersionWithBaseObjectStub);
    mergeLastVersionWithBaseObjectStub.restore();
    ThirdPartyPayerMock.verify();
    FundingHistoryMock.verify();
  });

  it('should populate funding history with monthly frequency', async () => {
    const fundingId = new ObjectID();
    const fundings = [{
      _id: fundingId,
      thirdPartyPayer: new ObjectID(),
      versions: [{ frequency: 'monthly', _id: fundingId }],
    }];
    const returnedHistories = [
      { careHours: 3, fundingId, month: '01/2019' },
      { careHours: 5, fundingId, month: '02/2019' },
    ];
    const funding = { ...fundings[0].versions[0], ...omit(fundings[0], ['versions']) };
    const mergeLastVersionWithBaseObjectStub = sinon.stub(UtilsHelper, 'mergeLastVersionWithBaseObject').returns(funding);

    ThirdPartyPayerMock
      .expects('findOne')
      .withArgs({ _id: fundings[0].thirdPartyPayer })
      .chain('lean')
      .resolves(null);

    FundingHistoryMock
      .expects('find')
      .withArgs({ fundingId: fundings[0]._id })
      .resolves(returnedHistories);

    const result = await DraftBillsHelper.populateFundings(fundings, new Date('2019/03/10'));

    expect(result).toBeDefined();
    expect(result[0].history).toBeDefined();
    expect(result[0].history.length).toEqual(3);
    const addedHistory = result[0].history.find(hist => hist.month === '03/2019');
    expect(addedHistory).toBeDefined();
    expect(addedHistory).toMatchObject({ careHours: 0, amountTTC: 0, fundingId, month: '03/2019' });
    sinon.assert.called(mergeLastVersionWithBaseObjectStub);
    mergeLastVersionWithBaseObjectStub.restore();
    ThirdPartyPayerMock.verify();
    FundingHistoryMock.verify();
  });
});

describe('getMatchingFunding', () => {
  it('should return null if fundings is empty', () => {
    expect(DraftBillsHelper.getMatchingFunding(new Date(), [])).toBeNull();
  });

  it('should return null is funding not started on date', () => {
    const fundings = [
      { _id: 1, careDays: [0, 2, 3], startDate: '2019-03-23T09:00:00', createdAt: '2019-03-23T09:00:00' },
      { _id: 3, careDays: [0, 3], startDate: '2019-02-23T09:00:00', createdAt: '2019-02-23T09:00:00' },
      { _id: 2, careDays: [1, 5, 6], startDate: '2019-04-23T09:00:00', createdAt: '2019-04-23T09:00:00' },
    ];
    const result = DraftBillsHelper.getMatchingFunding('2019-01-23T09:00:00', fundings);
    expect(result).toBeNull();
  });

  it('should return matching version with random day', () => {
    const fundings = [
      { _id: 1, careDays: [0, 2, 3], startDate: '2019-03-23T09:00:00', createdAt: '2019-03-23T09:00:00' },
      { _id: 3, careDays: [0, 3], startDate: '2019-02-23T09:00:00', createdAt: '2019-02-23T09:00:00' },
      { _id: 2, careDays: [1, 5, 6], startDate: '2019-04-23T09:00:00', createdAt: '2019-04-23T09:00:00' },
    ];
    const result = DraftBillsHelper.getMatchingFunding('2019-04-23T09:00:00', fundings);
    expect(result).toBeDefined();
    expect(result._id).toEqual(2);
  });

  it('should return matching version with holidays', () => {
    const fundings = [
      { _id: 1, careDays: [0, 2, 3], startDate: '2019-03-23T09:00:00' },
      { _id: 3, careDays: [4, 7], startDate: '2019-04-23T09:00:00' },
    ];
    const result = DraftBillsHelper.getMatchingFunding('2019-05-01T09:00:00', fundings);
    expect(result).toBeDefined();
    expect(result._id).toEqual(3);
  });

  it('should return null if no matching version', () => {
    const fundings = [
      { _id: 1, careDays: [0, 2, 3], startDate: '2019-03-23T09:00:00' },
      { _id: 2, careDays: [5, 6], startDate: '2019-04-23T09:00:00' },
    ];
    const result = DraftBillsHelper.getMatchingFunding('2019-04-23T09:00:00', fundings);
    expect(result).toBeNull();
  });
});

describe('getExclTaxes', () => {
  it('should return excluded taxes price', () => {
    expect(Number.parseFloat(DraftBillsHelper.getExclTaxes(20, 2).toFixed(2))).toEqual(19.61);
  });
});

describe('getInclTaxes', () => {
  it('should return excluded taxes price', () => {
    expect(DraftBillsHelper.getInclTaxes(20, 2)).toEqual(20.4);
  });
});

describe('getThirdPartyPayerPrice', () => {
  it('should compute tpp price', () => {
    expect(DraftBillsHelper.getThirdPartyPayerPrice(180, 10, 20)).toEqual(24);
  });
});

describe('getMatchingHistory', () => {
  it('should return history for once frequency', () => {
    const fundingId = new ObjectID();
    const funding = { _id: fundingId, frequency: 'once', history: { fundingId, careHours: 2 } };
    const result = DraftBillsHelper.getMatchingHistory({}, funding);
    expect(result).toBeDefined();
    expect(result.fundingId).toEqual(fundingId);
  });

  it('should return existing history for monthly frequency', () => {
    const fundingId = new ObjectID();
    const funding = {
      _id: fundingId,
      frequency: 'monthly',
      history: [{ fundingId, careHours: 2, month: '03/2019' }, { fundingId, careHours: 4, month: '02/2019' }],
    };
    const event = { startDate: new Date('2019/03/12') };
    const result = DraftBillsHelper.getMatchingHistory(event, funding);
    expect(result).toBeDefined();
    expect(result).toMatchObject({ fundingId, careHours: 2, month: '03/2019' });
  });

  it('should create history and add to list when missing for monthly frequency', () => {
    const fundingId = new ObjectID();
    const funding = {
      _id: fundingId,
      frequency: 'monthly',
      history: [{ fundingId, careHours: 2, month: '01/2019' }, { fundingId, careHours: 4, month: '02/2019' }],
    };
    const event = { startDate: new Date('2019/03/12') };
    const result = DraftBillsHelper.getMatchingHistory(event, funding);
    expect(result).toBeDefined();
    expect(result).toMatchObject({ careHours: 0, amountTTC: 0, fundingId, month: '03/2019' });
  });
});

describe('getHourlyFundingSplit', () => {
  const price = 50;
  const event = {
    startDate: (new Date('2019/03/12')).setHours(8),
    endDate: (new Date('2019/03/12')).setHours(10),
  };
  const service = { vat: 20 };
  let getExclTaxes;
  let getMatchingHistory;
  let getThirdPartyPayerPrice;
  beforeEach(() => {
    getExclTaxes = sinon.stub(DraftBillsHelper, 'getExclTaxes');
    getMatchingHistory = sinon.stub(DraftBillsHelper, 'getMatchingHistory');
    getThirdPartyPayerPrice = sinon.stub(DraftBillsHelper, 'getThirdPartyPayerPrice');
  });
  afterEach(() => {
    getExclTaxes.restore();
    getMatchingHistory.restore();
    getThirdPartyPayerPrice.restore();
  });

  it('case 1. Event fully invoiced to TPP', () => {
    const funding = {
      unitTTCRate: 21,
      careHours: 4,
      frequency: 'once',
      customerParticipationRate: 20,
      history: { careHours: 1 },
      thirdPartyPayer: { _id: new ObjectID() },
    };

    getExclTaxes.returns(17.5);
    getMatchingHistory.returns({ careHours: 1 });
    getThirdPartyPayerPrice.returns(28);

    const result = DraftBillsHelper.getHourlyFundingSplit(event, funding, service, price);
    expect(result).toBeDefined();
    expect(result.customerPrice).toEqual(22);
    expect(result.thirdPartyPayerPrice).toEqual(28);
    expect(result.history).toBeDefined();
    expect(result.history.careHours).toEqual(2);
    sinon.assert.calledWith(
      getThirdPartyPayerPrice,
      120,
      17.5,
      20
    );
  });

  it('case 2. Event partially invoiced to TPP', () => {
    const funding = {
      unitTTCRate: 21,
      careHours: 4,
      frequency: 'once',
      customerParticipationRate: 20,
      history: { careHours: 3 },
      thirdPartyPayer: { _id: new ObjectID() },
    };

    getExclTaxes.returns(17.5);
    getMatchingHistory.returns({ careHours: 3 });
    getThirdPartyPayerPrice.returns(14);

    const result = DraftBillsHelper.getHourlyFundingSplit(event, funding, service, price);
    expect(result).toBeDefined();
    expect(result.customerPrice).toEqual(36);
    expect(result.thirdPartyPayerPrice).toEqual(14);
    expect(result.history).toBeDefined();
    expect(result.history.careHours).toEqual(1);
    sinon.assert.calledWith(
      getThirdPartyPayerPrice,
      60,
      17.5,
      20
    );
  });
});

describe('getFixedFundingSplit', () => {
  const price = 50;
  const event = {
    startDate: (new Date('2019/03/12')).setHours(8),
    endDate: (new Date('2019/03/12')).setHours(10),
  };
  const service = { vat: 20 };
  let getExclTaxes;
  beforeEach(() => {
    getExclTaxes = sinon.stub(DraftBillsHelper, 'getExclTaxes');
  });
  afterEach(() => {
    getExclTaxes.restore();
  });

  it('Case 1. Event fully invoiced to TPP', () => {
    const funding = {
      history: { amountTTC: 10 },
      amountTTC: 100,
      thirdPartyPayer: { _id: new ObjectID() },
    };
    getExclTaxes.returns(50);

    const result = DraftBillsHelper.getFixedFundingSplit(event, funding, service, price);
    expect(result).toBeDefined();
    expect(result.customerPrice).toEqual(0);
    expect(result.thirdPartyPayerPrice).toEqual(50);
    expect(result.history).toBeDefined();
    expect(result.history.amountTTC).toEqual(60);
    sinon.assert.notCalled(getExclTaxes);
  });

  it('Case 2. Event partially invoiced to TPP', () => {
    const funding = {
      history: { amountTTC: 79 },
      amountTTC: 100,
      thirdPartyPayer: { _id: new ObjectID() },
    };
    getExclTaxes.returns(17.5);

    const result = DraftBillsHelper.getFixedFundingSplit(event, funding, service, price);
    expect(result).toBeDefined();
    expect(result.customerPrice).toEqual(32.5);
    expect(result.thirdPartyPayerPrice).toEqual(17.5);
    expect(result.history).toBeDefined();
    expect(result.history.amountTTC).toEqual(21);
    sinon.assert.calledWith(getExclTaxes, 21, 20);
  });
});

describe('getEventBilling', () => {
  const unitTTCRate = 21;
  const event = {
    startDate: (new Date('2019/05/08')).setHours(8),
    endDate: (new Date('2019/05/08')).setHours(10),
  };
  let getExclTaxes;
  let getEventSurcharges;
  let getSurchargedPrice;
  let getHourlyFundingSplit;
  let getFixedFundingSplit;
  beforeEach(() => {
    getExclTaxes = sinon.stub(DraftBillsHelper, 'getExclTaxes');
    getEventSurcharges = sinon.stub(SurchargesHelper, 'getEventSurcharges');
    getSurchargedPrice = sinon.stub(DraftBillsHelper, 'getSurchargedPrice');
    getHourlyFundingSplit = sinon.stub(DraftBillsHelper, 'getHourlyFundingSplit');
    getFixedFundingSplit = sinon.stub(DraftBillsHelper, 'getFixedFundingSplit');
  });
  afterEach(() => {
    getExclTaxes.restore();
    getEventSurcharges.restore();
    getSurchargedPrice.restore();
    getHourlyFundingSplit.restore();
    getFixedFundingSplit.restore();
  });

  it('should return event prices wihtout funding and without surcharge', () => {
    const service = { vat: 20 };
    getExclTaxes.returns(17.5);

    const result = DraftBillsHelper.getEventBilling(event, unitTTCRate, service);
    expect(result).toBeDefined();
    expect(result).toEqual({ customerPrice: 35, thirdPartyPayerPrice: 0 });
    sinon.assert.notCalled(getHourlyFundingSplit);
    sinon.assert.notCalled(getFixedFundingSplit);
    sinon.assert.notCalled(getEventSurcharges);
    sinon.assert.notCalled(getSurchargedPrice);
  });

  it('should return event prices with surcharge', () => {
    const service = { vat: 20, nature: 'hourly', surcharge: { publicHoliday: 10 } };
    getExclTaxes.returns(17.5);
    getSurchargedPrice.returns(38.5);
    getEventSurcharges.returns([{ percentage: 10 }]);

    const result = DraftBillsHelper.getEventBilling(event, unitTTCRate, service);
    expect(result).toBeDefined();
    expect(result).toEqual({
      customerPrice: 38.5,
      thirdPartyPayerPrice: 0,
      surcharges: [{ percentage: 10 }],
    });
    sinon.assert.calledOnce(getEventSurcharges);
    sinon.assert.calledWith(getSurchargedPrice, event, [{ percentage: 10 }], 35);
    sinon.assert.notCalled(getHourlyFundingSplit);
    sinon.assert.notCalled(getFixedFundingSplit);
  });

  it('should return event prices with hourly funding', () => {
    const service = { vat: 20 };
    const funding = {
      nature: 'hourly',
      unitTTCRate: 15,
      careHours: 4,
      frequency: 'once',
      customerParticipationRate: 0,
      history: { careHours: 1 },
      thirdPartyPayer: { _id: new ObjectID() },
    };
    getExclTaxes.returns(17.5);
    getHourlyFundingSplit.returns({ customerPrice: 10, thirdPartyPayerPrice: 25 });

    const result = DraftBillsHelper.getEventBilling(event, unitTTCRate, service, funding);
    expect(result).toBeDefined();
    expect(result).toEqual({ customerPrice: 10, thirdPartyPayerPrice: 25 });
    sinon.assert.calledWith(getHourlyFundingSplit, event, funding, service, 35);
    sinon.assert.notCalled(getFixedFundingSplit);
    sinon.assert.notCalled(getEventSurcharges);
    sinon.assert.notCalled(getSurchargedPrice);
  });

  it('should return event prices with fixed funding', () => {
    const service = { vat: 20 };
    const funding = {
      nature: 'fixed',
      history: { amountTTC: 50 },
      amountTTC: 100,
      thirdPartyPayer: { _id: new ObjectID() },
    };
    getExclTaxes.returns(17.5);
    getFixedFundingSplit.returns({ customerPrice: 0, thirdPartyPayerPrice: 35 });

    const result = DraftBillsHelper.getEventBilling(event, unitTTCRate, service, funding);
    expect(result).toBeDefined();
    expect(result).toEqual({ customerPrice: 0, thirdPartyPayerPrice: 35 });
    sinon.assert.calledWith(getFixedFundingSplit, event, funding, service, 35);
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
      thirdPartyPayer: { _id: new ObjectID() },
    };
    getExclTaxes.returns(17.5);
    getHourlyFundingSplit.returns({ customerPrice: 10, thirdPartyPayerPrice: 25 });
    getSurchargedPrice.returns(38.5);
    getEventSurcharges.returns([{ percentage: 10 }]);

    const result = DraftBillsHelper.getEventBilling(event, unitTTCRate, service, funding);
    expect(result).toBeDefined();
    expect(result).toEqual({
      customerPrice: 10,
      thirdPartyPayerPrice: 25,
      surcharges: [{ percentage: 10 }],
    });
    sinon.assert.calledWith(getHourlyFundingSplit, event, funding, service, 38.5);
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
      thirdPartyPayer: { _id: new ObjectID() },
    };
    getExclTaxes.returns(17.5);
    getFixedFundingSplit.returns({ customerPrice: 0, thirdPartyPayerPrice: 35 });
    getSurchargedPrice.returns(38.5);
    getEventSurcharges.returns([{ percentage: 10 }]);

    const result = DraftBillsHelper.getEventBilling(event, unitTTCRate, service, funding);
    expect(result).toBeDefined();
    expect(result).toEqual({
      customerPrice: 0,
      thirdPartyPayerPrice: 35,
      surcharges: [{ percentage: 10 }],
    });
    sinon.assert.calledWith(getFixedFundingSplit, event, funding, service, 38.5);
    sinon.assert.notCalled(getHourlyFundingSplit);
    sinon.assert.calledOnce(getEventSurcharges);
    sinon.assert.calledOnce(getSurchargedPrice);
  });

  it('should return event prices with fixed service', () => {
    const service = { vat: 20, nature: 'fixed' };
    getExclTaxes.returns(17.5);

    const result = DraftBillsHelper.getEventBilling(event, unitTTCRate, service);
    expect(result).toBeDefined();
    result.customerPrice = Number.parseFloat(result.customerPrice.toFixed(2));
    expect(result).toEqual({ customerPrice: 17.5, thirdPartyPayerPrice: 0 });
    sinon.assert.notCalled(getHourlyFundingSplit);
    sinon.assert.notCalled(getFixedFundingSplit);
    sinon.assert.notCalled(getEventSurcharges);
    sinon.assert.notCalled(getSurchargedPrice);
  });
});

describe('formatDraftBillsForCustomer', () => {
  const customerPrices = { exclTaxes: 20, inclTaxes: 25, hours: 3, eventsList: [{ event: '123456' }] };
  const event = {
    _id: 'abc',
    startDate: (new Date('2019/05/08')).setHours(8),
    endDate: (new Date('2019/05/08')).setHours(10),
  };
  const service = { vat: 20 };
  let getInclTaxes;
  beforeEach(() => {
    getInclTaxes = sinon.stub(DraftBillsHelper, 'getInclTaxes');
  });
  afterEach(() => {
    getInclTaxes.restore();
  });

  it('should format bill for customer without tpp info', () => {
    const eventPrice = { customerPrice: 17.5 };
    getInclTaxes.callsFake((exclTaxes, vat) => exclTaxes * (1 + (vat / 100)));

    const result = DraftBillsHelper.formatDraftBillsForCustomer(customerPrices, event, eventPrice, service);
    expect(result).toBeDefined();
    expect(result).toMatchObject({
      eventsList: [
        { event: '123456' },
        { event: 'abc', inclTaxesCustomer: 21, exclTaxesCustomer: 17.5 },
      ],
      hours: 5,
      exclTaxes: 37.5,
      inclTaxes: 46,
    });
  });

  it('should format bill for customer with tpp info', () => {
    const eventPrice = { customerPrice: 17.5, thirdPartyPayerPrice: 12.5, thirdPartyPayer: 'tpp' };
    getInclTaxes.callsFake((exclTaxes, vat) => exclTaxes * (1 + (vat / 100)));

    const result = DraftBillsHelper.formatDraftBillsForCustomer(customerPrices, event, eventPrice, service);
    expect(result).toBeDefined();
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
  });
});

describe('formatDraftBillsForTPP', () => {
  let getInclTaxes;
  beforeEach(() => {
    getInclTaxes = sinon.stub(DraftBillsHelper, 'getInclTaxes');
  });
  afterEach(() => {
    getInclTaxes.restore();
  });

  it('should format bill for tpp', () => {
    const tppId = new ObjectID();
    const tpp = { _id: tppId };
    const tppPrices = {
      [tppId]: { exclTaxes: 20, inclTaxes: 25, hours: 3, eventsList: [{ event: '123456' }] },
    };
    const event = {
      _id: 'abc',
      startDate: (new Date('2019/05/08')).setHours(8),
      endDate: (new Date('2019/05/08')).setHours(10),
    };
    const eventPrice = {
      customerPrice: 17.5,
      thirdPartyPayerPrice: 12.5,
      thirdPartyPayer: tppId,
      history: {},
      chargedTime: 120,
    };
    const service = { vat: 20 };
    getInclTaxes.callsFake((exclTaxes, vat) => exclTaxes * (1 + (vat / 100)));

    const result = DraftBillsHelper.formatDraftBillsForTPP(tppPrices, tpp, event, eventPrice, service);
    expect(result).toBeDefined();
    expect(result[tppId]).toBeDefined();
    expect(result[tppId].exclTaxes).toEqual(32.5);
    expect(result[tppId].inclTaxes).toEqual(40);
    expect(result[tppId].hours).toEqual(5);
    expect(result[tppId].eventsList).toMatchObject([
      { event: '123456' },
      {
        event: 'abc',
        inclTaxesTpp: 15,
        exclTaxesTpp: 12.5,
        thirdPartyPayer: tppId,
        inclTaxesCustomer: 21,
        exclTaxesCustomer: 17.5,
      },
    ]);
  });
});

describe('getDraftBillsPerSubscription', () => {
  const events = [
    { _id: 1, startDate: new Date('2019/02/15').setHours(8), endDate: new Date('2019/02/15').setHours(10) },
    { _id: 2, startDate: new Date('2019/01/15').setHours(8), endDate: new Date('2019/01/15').setHours(10) },
  ];
  const customer = {};
  const subscription = {
    versions: [{ startDate: new Date('2019/01/01'), unitTTCRate: 21 }],
    service: {
      versions: [{ startDate: new Date('2019/01/01'), vat: 20 }],
    },
  };
  const query = {
    billingStartDate: new Date('2019/02/01'),
  };
  let getLastVersion;
  let getMatchingVersion;
  let getMatchingFunding;
  let getEventBilling;
  let formatDraftBillsForCustomer;
  let formatDraftBillsForTPP;
  let getExclTaxes;
  beforeEach(() => {
    getLastVersion = sinon.stub(UtilsHelper, 'getLastVersion');
    getMatchingVersion = sinon.stub(UtilsHelper, 'getMatchingVersion');
    getMatchingFunding = sinon.stub(DraftBillsHelper, 'getMatchingFunding');
    getEventBilling = sinon.stub(DraftBillsHelper, 'getEventBilling');
    formatDraftBillsForCustomer = sinon.stub(DraftBillsHelper, 'formatDraftBillsForCustomer');
    formatDraftBillsForTPP = sinon.stub(DraftBillsHelper, 'formatDraftBillsForTPP');
    getExclTaxes = sinon.stub(DraftBillsHelper, 'getExclTaxes');
  });
  afterEach(() => {
    getLastVersion.restore();
    getMatchingVersion.restore();
    getMatchingFunding.restore();
    getEventBilling.restore();
    formatDraftBillsForCustomer.restore();
    formatDraftBillsForTPP.restore();
    getExclTaxes.restore();
  });

  it('should return draft bill without tpp', () => {
    const fundings = [];
    getLastVersion.returns({ startDate: new Date('2019/01/01'), unitTTCRate: 21 });
    getMatchingVersion.returns({ startDate: new Date('2019/01/01'), vat: 20 });
    getEventBilling.returns({ customerPrice: 12 });
    formatDraftBillsForCustomer.returns({ exclTaxes: 70, inclTaxes: 84 });
    getExclTaxes.returns(70);

    const result = DraftBillsHelper.getDraftBillsPerSubscription(events, customer, subscription, fundings, query);
    expect(result).toBeDefined();
    expect(result.customer).toBeDefined();
    expect(moment(result.customer.startDate).format('DD/MM/YYYY')).toEqual('15/01/2019');
    expect(result.customer.exclTaxes).toEqual(70);
    expect(result.customer.inclTaxes).toEqual(84);
    sinon.assert.notCalled(getMatchingFunding);
    sinon.assert.notCalled(formatDraftBillsForTPP);
    sinon.assert.calledWith(getLastVersion, [{ startDate: new Date('2019/01/01'), unitTTCRate: 21 }], 'createdAt');
  });

  it('should return draft bill with tpp', () => {
    const tppId = new ObjectID();
    const fundings = [
      {
        _id: 'version',
        thirdPartyPayer: { _id: tppId },
        careDays: [1, 4, 5],
        startDate: new Date('2019/01/01'),
        frequency: 'once',
        nature: 'fixed',
        amountTTC: 200,
        history: { amountTTC: 185 },
      },
      {
        _id: 'version2',
        thirdPartyPayer: { _id: new ObjectID() },
        careDays: [0],
        startDate: new Date('2019/01/01'),
        frequency: 'once',
        nature: 'fixed',
        amountTTC: 200,
        history: { amountTTC: 185 },
      },
    ];
    getLastVersion.returns({ startDate: new Date('2019/01/01'), unitTTCRate: 21 });
    getMatchingVersion.returns({ startDate: new Date('2019/01/01'), vat: 20 });
    getMatchingFunding.returns(fundings[0]);
    getEventBilling.returns({ customerPrice: 12, thirdPartyPayerPrice: 15 });
    formatDraftBillsForCustomer.returns({ exclTaxes: 57.5, inclTaxes: 69 });
    formatDraftBillsForTPP.returns({ [tppId]: { exclTaxes: 12.5, inclTaxes: 15 } });
    getExclTaxes.returns(17.5);

    const result = DraftBillsHelper.getDraftBillsPerSubscription(events, customer, subscription, fundings, query);
    expect(result).toBeDefined();
    expect(result.customer).toBeDefined();
    expect(moment(result.customer.startDate).format('DD/MM/YYYY')).toEqual('15/01/2019');
    expect(result.customer.exclTaxes).toEqual(57.5);
    expect(result.customer.inclTaxes).toEqual(69);
    expect(result.customer.unitExclTaxes).toEqual(17.5);
    expect(result.thirdPartyPayer).toBeDefined();
    expect(result.thirdPartyPayer[tppId].exclTaxes).toEqual(12.5);
    expect(result.thirdPartyPayer[tppId].inclTaxes).toEqual(15);
  });
});

describe('getDraftBillsList', () => {
  const dates = { endDate: '2019-12-25T07:00:00' };
  const billingStartDate = '2019-12-31T07:00:00';
  let getEventsToBill;
  let populateSurcharge;
  let populateFundings;
  let getDraftBillsPerSubscription;
  beforeEach(() => {
    getEventsToBill = sinon.stub(EventRepository, 'getEventsToBill');
    populateSurcharge = sinon.stub(DraftBillsHelper, 'populateSurcharge');
    populateFundings = sinon.stub(DraftBillsHelper, 'populateFundings');
    getDraftBillsPerSubscription = sinon.stub(DraftBillsHelper, 'getDraftBillsPerSubscription');
  });
  afterEach(() => {
    getEventsToBill.restore();
    populateSurcharge.restore();
    populateFundings.restore();
    getDraftBillsPerSubscription.restore();
  });

  it('should return empty array if not event to bill', async () => {
    getEventsToBill.returns([]);
    const result = await DraftBillsHelper.getDraftBillsList(dates, billingStartDate);

    expect(result).toEqual([]);
    sinon.assert.calledWith(getEventsToBill, dates);
    sinon.assert.notCalled(populateSurcharge);
    sinon.assert.notCalled(populateFundings);
    sinon.assert.notCalled(getDraftBillsPerSubscription);
  });

  it('should return customer and tpp draft bills', async () => {
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
    populateSurcharge.returnsArg(0);
    populateFundings.returnsArg(0);
    getDraftBillsPerSubscription.onCall(0).returns({
      customer: { identity: { firstname: 'Toto' }, inclTaxes: 20 },
      thirdPartyPayer: {
        tpp: { inclTaxes: 13 },
      },
    });
    getDraftBillsPerSubscription.onCall(1).returns({
      customer: { identity: { firstname: 'Toto' }, inclTaxes: 21 },
      thirdPartyPayer: {
        tpp: { inclTaxes: 24 },
      },
    });

    const result = await DraftBillsHelper.getDraftBillsList(dates, billingStartDate);

    expect(result).toEqual([
      {
        customerId: 'ghjk',
        customer: { _id: 'ghjk', identity: { firstname: 'Toto' } },
        customerBills: {
          bills: [
            { identity: { firstname: 'Toto' }, inclTaxes: 20 },
            { identity: { firstname: 'Toto' }, inclTaxes: 21 },
          ],
          total: 41,
        },
        thirdPartyPayerBills: [{
          bills: [
            { inclTaxes: 13 },
            { inclTaxes: 24 },
          ],
          total: 37,
        }],
      },
    ]);
    sinon.assert.calledWith(getEventsToBill, dates);
    sinon.assert.calledWith(populateSurcharge.firstCall, { _id: '1234567890' });
    sinon.assert.calledWith(populateSurcharge.secondCall, { _id: '0987654321' });
    sinon.assert.calledWith(populateFundings.firstCall, [{ nature: 'hourly' }], '2019-12-25T07:00:00');
    sinon.assert.calledWith(populateFundings.secondCall, [{ nature: 'fixed' }], '2019-12-25T07:00:00');
    sinon.assert.calledWith(
      getDraftBillsPerSubscription.firstCall,
      [{ type: 'intervention', _id: '1234' }],
      { _id: 'ghjk', identity: { firstname: 'Toto' } },
      { _id: '1234567890' },
      [{ nature: 'hourly' }],
      billingStartDate,
      '2019-12-25T07:00:00'
    );
    sinon.assert.calledWith(
      getDraftBillsPerSubscription.secondCall,
      [{ type: 'intervention', _id: '5678' }],
      { _id: 'ghjk', identity: { firstname: 'Toto' } },
      { _id: '0987654321' },
      [{ nature: 'fixed' }],
      billingStartDate,
      '2019-12-25T07:00:00'
    );
  });

  it('should return customer draft bills', async () => {
    getEventsToBill.returns([
      {
        customer: { _id: 'ghjk', identity: { firstname: 'Toto' } },
        eventsBySubscriptions: [
          { subscription: { _id: '1234567890' }, events: [{ type: 'intervention', _id: '1234' }] },
          { subscription: { _id: '0987654321' }, events: [{ type: 'intervention', _id: '5678' }] },
        ],
      },
      {
        customer: { _id: 'asdf', identity: { firstname: 'Tata' } },
        eventsBySubscriptions: [
          { subscription: { _id: 'qwertyuiop' }, events: [{ type: 'intervention', _id: '9876' }] },
        ],
      },
    ]);
    populateSurcharge.returnsArg(0);
    getDraftBillsPerSubscription.onCall(0).returns({ customer: { identity: { firstname: 'Toto' }, inclTaxes: 20 } });
    getDraftBillsPerSubscription.onCall(1).returns({ customer: { identity: { firstname: 'Toto' }, inclTaxes: 21 } });
    getDraftBillsPerSubscription.onCall(2).returns({ customer: { identity: { firstname: 'Tata' }, inclTaxes: 23 } });

    const result = await DraftBillsHelper.getDraftBillsList(dates, billingStartDate);

    expect(result).toEqual([
      {
        customerId: 'ghjk',
        customer: { _id: 'ghjk', identity: { firstname: 'Toto' } },
        customerBills: {
          bills: [
            { identity: { firstname: 'Toto' }, inclTaxes: 20 },
            { identity: { firstname: 'Toto' }, inclTaxes: 21 },
          ],
          total: 41,
        },
      },
      {
        customerId: 'asdf',
        customer: { _id: 'asdf', identity: { firstname: 'Tata' } },
        customerBills: {
          bills: [
            { identity: { firstname: 'Tata' }, inclTaxes: 23 },
          ],
          total: 23,
        },
      },
    ]);
    sinon.assert.calledWith(getEventsToBill);
    sinon.assert.calledWith(populateSurcharge.firstCall, { _id: '1234567890' });
    sinon.assert.calledWith(populateSurcharge.secondCall, { _id: '0987654321' });
    sinon.assert.calledWith(populateSurcharge.thirdCall, { _id: 'qwertyuiop' });
    sinon.assert.notCalled(populateFundings);
    sinon.assert.calledWith(
      getDraftBillsPerSubscription.firstCall,
      [{ type: 'intervention', _id: '1234' }],
      { _id: 'ghjk', identity: { firstname: 'Toto' } },
      { _id: '1234567890' },
      null,
      billingStartDate,
      '2019-12-25T07:00:00'
    );
    sinon.assert.calledWith(
      getDraftBillsPerSubscription.secondCall,
      [{ type: 'intervention', _id: '5678' }],
      { _id: 'ghjk', identity: { firstname: 'Toto' } },
      { _id: '0987654321' },
      null,
      billingStartDate,
      '2019-12-25T07:00:00'
    );
    sinon.assert.calledWith(
      getDraftBillsPerSubscription.thirdCall,
      [{ type: 'intervention', _id: '9876' }],
      { _id: 'asdf', identity: { firstname: 'Tata' } },
      { _id: 'qwertyuiop' },
      null,
      billingStartDate,
      '2019-12-25T07:00:00'
    );
  });
});

describe('getSurchargedPrice', () => {
  const event = {
    startDate: '2019-06-29T10:00:00.000+02:00',
    endDate: '2019-06-29T16:00:00.000+02:00',
  };

  it('should return the price if there is no surcharge', () => {
    expect(DraftBillsHelper.getSurchargedPrice(event, [], 11)).toBe(11);
  });

  it('should return the price surcharged globally', () => {
    const surcharges = [{ percentage: 25 }];
    expect(DraftBillsHelper.getSurchargedPrice(event, surcharges, 10)).toBe(12.5);
  });

  it('should return the price surcharged once', () => {
    const surcharges = [{
      percentage: 25,
      startHour: moment(event.startDate).add(1, 'h'),
      endHour: moment(event.startDate).add(2, 'h'),
    }];
    expect(DraftBillsHelper.getSurchargedPrice(event, surcharges, 24)).toBe(25);
  });

  it('should return the price surcharged twice', () => {
    const surcharges = [{
      percentage: 25,
      startHour: moment(event.startDate).add(1, 'h'),
      endHour: moment(event.startDate).add(2, 'h'),
    }, {
      percentage: 20,
      startHour: moment(event.startDate).add(2, 'h'),
      endHour: moment(event.startDate).add(4, 'h'),
    }];
    expect(DraftBillsHelper.getSurchargedPrice(event, surcharges, 24)).toBe(26.6);
  });
});
