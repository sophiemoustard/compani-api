const { expect } = require('expect');
const sinon = require('sinon');
const moment = require('moment');
const { ObjectId } = require('mongodb');
const DraftFinalPayHelper = require('../../../src/helpers/draftFinalPay');
const DraftPayHelper = require('../../../src/helpers/draftPay');
const Company = require('../../../src/models/Company');
const Surcharge = require('../../../src/models/Surcharge');
const DistanceMatrix = require('../../../src/models/DistanceMatrix');
const FinalPay = require('../../../src/models/FinalPay');
const ContractRepository = require('../../../src/repositories/ContractRepository');
const EventRepository = require('../../../src/repositories/EventRepository');
const SinonMongoose = require('../sinonMongoose');

describe('computeAuxiliaryDraftFinalPay', () => {
  let computeBalance;
  let genericData;
  let computeDiff;
  beforeEach(() => {
    computeBalance = sinon.stub(DraftPayHelper, 'computeBalance');
    genericData = sinon.stub(DraftPayHelper, 'genericData');
    computeDiff = sinon.stub(DraftPayHelper, 'computeDiff');
  });
  afterEach(() => {
    computeBalance.restore();
    genericData.restore();
    computeDiff.restore();
  });

  it('should return draft pay for one auxiliary', async () => {
    const aux = {
      _id: '1234567890',
      identity: { firstname: 'Hugo', lastname: 'Lloris' },
      sector: { name: 'La ruche' },
      contracts: [{
        startDate: '2019-03-02T00:00:00',
        endDate: '2019-05-17T23:59:59',
        endReason: 'plus envie',
        endNotificationDate: '2019-05-12T23:59:59',
      }],
      administrative: { mutualFund: { has: true } },
    };
    const events = { events: [[{ auxiliary: '1234567890' }]], absences: [] };
    const subId = new ObjectId();
    const subscriptions = { [subId]: { _id: ObjectId(), service: { _id: ObjectId() } } };
    const company = { rhConfig: { phoneFeeAmount: 37 } };
    const query = { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' };
    const prevPay = { hoursCounter: 10, diff: { workedHours: 3, hoursBalance: 2 } };
    const computedPay = {
      startDate: '2019-05-01T00:00:00',
      contractHours: 150,
      workedHours: 138,
      notSurchargedAndNotExempt: 15,
      surchargedAndNotExempt: 9,
      hoursBalance: 4,
      transport: 26.54,
      phoneFees: 29.6,
    };
    computeBalance.returns(computedPay);
    genericData.returns({
      auxiliaryId: '1234567890',
      auxiliary: { _id: '1234567890' },
      overtimeHours: 0,
      additionalHours: 0,
      bonus: 0,
      month: '05-2019',
    });

    const result = await DraftFinalPayHelper.computeAuxiliaryDraftFinalPay(
      aux,
      events,
      subscriptions,
      prevPay,
      company,
      query,
      [],
      []
    );

    expect(result).toBeDefined();
    expect(result).toEqual({
      ...computedPay,
      hoursCounter: 16,
      auxiliaryId: '1234567890',
      auxiliary: { _id: '1234567890' },
      startDate: '2019-05-01T00:00:00',
      overtimeHours: 0,
      additionalHours: 0,
      bonus: 0,
      mutual: false,
      month: '05-2019',
      endDate: '2019-05-17T23:59:59',
      endNotificationDate: '2019-05-12T23:59:59',
      endReason: 'plus envie',
      compensation: 0,
      diff: { workedHours: 3, hoursBalance: 2 },
      previousMonthHoursCounter: 10,
    });
    sinon.assert.notCalled(computeDiff);
    sinon.assert.calledOnceWithExactly(
      computeBalance,
      aux,
      aux.contracts[0],
      events,
      subscriptions,
      company,
      query,
      [],
      []
    );
  });

  it('should return draft pay for one auxiliary if no prevPay', async () => {
    const aux = {
      _id: '1234567890',
      identity: { firstname: 'Hugo', lastname: 'Lloris' },
      sector: { name: 'La ruche' },
      contracts: [{
        startDate: '2019-03-02T00:00:00',
        endDate: '2019-05-17T23:59:59',
        endReason: 'plus envie',
        endNotificationDate: '2019-05-12T23:59:59',
      }],
      administrative: { mutualFund: { has: true } },
    };
    const events = { events: [[{ auxiliary: '1234567890' }]], absences: [] };
    const subId = new ObjectId();
    const subscriptions = { [subId]: { _id: ObjectId(), service: { _id: ObjectId() } } };
    const company = { rhConfig: { phoneFeeAmount: 37 } };
    const query = { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' };
    const computedPay = {
      startDate: '2019-05-01T00:00:00',
      contractHours: 150,
      workedHours: 138,
      notSurchargedAndNotExempt: 15,
      surchargedAndNotExempt: 9,
      hoursBalance: 4,
      transport: 26.54,
      phoneFees: 29.6,
    };
    computeBalance.returns(computedPay);
    computeDiff.returns({ workedHours: 0, hoursBalance: 0 });
    genericData.returns({
      auxiliaryId: '1234567890',
      auxiliary: { _id: '1234567890' },
      overtimeHours: 0,
      additionalHours: 0,
      bonus: 0,
      month: '05-2019',
    });

    const result =
      await DraftFinalPayHelper.computeAuxiliaryDraftFinalPay(aux, events, subscriptions, null, company, query, [], []);

    expect(result).toBeDefined();
    expect(result).toEqual({
      ...computedPay,
      hoursCounter: 4,
      auxiliaryId: '1234567890',
      auxiliary: { _id: '1234567890' },
      startDate: '2019-05-01T00:00:00',
      overtimeHours: 0,
      additionalHours: 0,
      bonus: 0,
      mutual: false,
      month: '05-2019',
      endDate: '2019-05-17T23:59:59',
      endNotificationDate: '2019-05-12T23:59:59',
      endReason: 'plus envie',
      compensation: 0,
      diff: { workedHours: 0, hoursBalance: 0 },
      previousMonthHoursCounter: 0,
    });
    sinon.assert.calledOnceWithExactly(computeDiff, null, null, 0, 0);
    sinon.assert.calledOnceWithExactly(
      computeBalance,
      aux,
      aux.contracts[0],
      events,
      subscriptions,
      company,
      query,
      [],
      []
    );
  });
});

describe('computeDraftFinalPay', () => {
  let companyFindOne;
  let surchargeFind;
  let distanceMatrixFind;
  let findPay;
  let getEventsToPay;
  let getSubscriptionsForPay;
  let getPreviousMonthPay;
  let computeAuxiliaryDraftFinalPay;

  beforeEach(() => {
    getEventsToPay = sinon.stub(EventRepository, 'getEventsToPay');
    getSubscriptionsForPay = sinon.stub(DraftPayHelper, 'getSubscriptionsForPay');
    companyFindOne = sinon.stub(Company, 'findOne');
    surchargeFind = sinon.stub(Surcharge, 'find');
    distanceMatrixFind = sinon.stub(DistanceMatrix, 'find');
    findPay = sinon.stub(FinalPay, 'find');
    getPreviousMonthPay = sinon.stub(DraftPayHelper, 'getPreviousMonthPay');
    computeAuxiliaryDraftFinalPay = sinon.stub(DraftFinalPayHelper, 'computeAuxiliaryDraftFinalPay');
  });

  afterEach(() => {
    getEventsToPay.restore();
    getSubscriptionsForPay.restore();
    companyFindOne.restore();
    surchargeFind.restore();
    distanceMatrixFind.restore();
    findPay.restore();
    getPreviousMonthPay.restore();
    computeAuxiliaryDraftFinalPay.restore();
  });

  it('should compute draft final pay', async () => {
    const query = { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' };
    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId } };
    const auxiliaryId = new ObjectId();
    const auxiliaries = [{ _id: auxiliaryId, sector: { name: 'Abeilles' } }];
    const payData = [
      {
        events: [{ _id: auxiliaryId, events: [{ startDate: '2019-05-03T10:00:00' }] }],
        absences: [{ _id: auxiliaryId, events: [{ startDate: '2019-05-06T10:00:00' }] }],
        auxiliary: { _id: auxiliaryId },
      },
      {
        events: [{ _id: new ObjectId(), events: [{ startDate: '2019-05-04T10:00:00' }] }],
        absences: [{ _id: new ObjectId(), events: [{ startDate: '2019-05-07T10:00:00' }] }],
        auxiliary: { _id: new ObjectId() },
      },
    ];
    const subId = new ObjectId();
    const subscriptions = { [subId]: { _id: ObjectId(), service: { _id: ObjectId() } } };
    const prevPay = [
      { auxiliary: auxiliaryId, hoursCounter: 23, diff: 2 },
      { auxiliary: new ObjectId(), hoursCounter: 25, diff: -3 },
    ];
    const existingPay = [{ auxiliary: new ObjectId() }];

    getEventsToPay.returns(payData);
    getSubscriptionsForPay.returns(subscriptions);
    surchargeFind.returns(SinonMongoose.stubChainedQueries([{ _id: 'surcharge' }], ['lean']));
    companyFindOne.returns(SinonMongoose.stubChainedQueries({}, ['lean']));
    distanceMatrixFind.returns(SinonMongoose.stubChainedQueries([{ _id: 'dm' }], ['lean']));
    findPay.returns(existingPay);
    getPreviousMonthPay.returns(prevPay);
    computeAuxiliaryDraftFinalPay.returns({ hoursBalance: 120 });

    const result = await DraftFinalPayHelper.computeDraftFinalPay(auxiliaries, query, credentials);

    expect(result).toBeDefined();
    expect(result).toEqual([{ hoursBalance: 120 }]);
    SinonMongoose.calledOnceWithExactly(
      surchargeFind,
      [{ query: 'find', args: [{ company: companyId }] }, { query: 'lean' }]
    );
    SinonMongoose.calledOnceWithExactly(
      companyFindOne,
      [{ query: 'findOne', args: [{ _id: companyId }] }, { query: 'lean' }]
    );
    SinonMongoose.calledOnceWithExactly(
      surchargeFind,
      [{ query: 'find', args: [{ company: credentials.company._id }] }, { query: 'lean' }]
    );
    sinon.assert.calledWithExactly(
      getPreviousMonthPay,
      auxiliaries,
      subscriptions,
      query,
      [{ _id: 'surcharge' }],
      [{ _id: 'dm' }],
      companyId
    );
    sinon.assert.calledWithExactly(
      computeAuxiliaryDraftFinalPay,
      { _id: auxiliaryId, sector: { name: 'Abeilles' } },
      {
        events: [{ _id: auxiliaryId, events: [{ startDate: '2019-05-03T10:00:00' }] }],
        absences: [{ _id: auxiliaryId, events: [{ startDate: '2019-05-06T10:00:00' }] }],
        auxiliary: { _id: auxiliaryId },
      },
      subscriptions,
      { auxiliary: auxiliaryId, hoursCounter: 23, diff: 2 },
      {},
      query,
      [{ _id: 'dm' }],
      [{ _id: 'surcharge' }]
    );
  });

  it('should compute draft pay on january', async () => {
    const query = { startDate: '2019-01-01T00:00:00', endDate: '2019-01-31T23:59:59' };
    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId } };
    const auxiliaryId = new ObjectId();
    const auxiliaries = [{ _id: auxiliaryId, sector: { name: 'Abeilles' } }];
    const payData = [
      {
        events: [{ _id: auxiliaryId, events: [{ startDate: '2019-01-03T10:00:00' }] }],
        absences: [{ _id: auxiliaryId, events: [{ startDate: '2019-01-06T10:00:00' }] }],
        auxiliary: { _id: auxiliaryId },
      },
      {
        events: [{ _id: new ObjectId(), events: [{ startDate: '2019-01-04T10:00:00' }] }],
        absences: [{ _id: new ObjectId(), events: [{ startDate: '2019-01-07T10:00:00' }] }],
        auxiliary: { _id: new ObjectId() },
      },
    ];
    const subId = new ObjectId();
    const subscriptions = { [subId]: { _id: ObjectId(), service: { _id: ObjectId() } } };
    const prevPay = [
      { auxiliary: auxiliaryId, hoursCounter: 23, diff: 2 },
      { auxiliary: new ObjectId(), hoursCounter: 25, diff: -3 },
    ];
    const existingPay = [{ auxiliary: new ObjectId() }];

    getEventsToPay.returns(payData);
    getSubscriptionsForPay.returns(subscriptions);
    surchargeFind.returns(SinonMongoose.stubChainedQueries([{ _id: 'surcharge' }], ['lean']));
    companyFindOne.returns(SinonMongoose.stubChainedQueries({}, ['lean']));
    distanceMatrixFind.returns(SinonMongoose.stubChainedQueries([{ _id: 'dm' }], ['lean']));
    findPay.returns(existingPay);
    getPreviousMonthPay.returns(prevPay);
    computeAuxiliaryDraftFinalPay.returns({ hoursBalance: 120 });

    const result = await DraftFinalPayHelper.computeDraftFinalPay(auxiliaries, query, credentials);

    expect(result).toBeDefined();
    expect(result).toEqual([{ hoursBalance: 120 }]);

    sinon.assert.notCalled(getPreviousMonthPay);
  });
});

describe('getDraftPay', () => {
  let getAuxiliariesToPay;
  let computeDraftFinalPay;
  beforeEach(() => {
    getAuxiliariesToPay = sinon.stub(ContractRepository, 'getAuxiliariesToPay');
    computeDraftFinalPay = sinon.stub(DraftFinalPayHelper, 'computeDraftFinalPay');
  });
  afterEach(() => {
    getAuxiliariesToPay.restore();
    computeDraftFinalPay.restore();
  });

  it('should return an empty array if no auxiliary', async () => {
    const query = { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' };
    const credentials = { company: { _id: '1234567890' } };
    getAuxiliariesToPay.returns([]);

    const result = await DraftFinalPayHelper.getDraftFinalPay(query, credentials);

    expect(result).toBeDefined();
    expect(result).toEqual([]);
    sinon.assert.notCalled(computeDraftFinalPay);
    sinon.assert.calledWithExactly(
      getAuxiliariesToPay,
      {
        endDate: {
          $exists: true,
          $lte: moment(query.endDate).endOf('d').toDate(),
          $gte: moment(query.startDate).startOf('d').toDate(),
        },
      },
      moment('2019-05-31T23:59:59').endOf('d').toDate(),
      'finalpays',
      credentials.company._id
    );
  });

  it('should return draft pay', async () => {
    const query = { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' };
    const credentials = { company: { _id: new ObjectId() } };
    const auxiliaryId = new ObjectId();
    const auxiliaries = [{ _id: auxiliaryId, sector: { name: 'Abeilles' } }];

    getAuxiliariesToPay.returns(auxiliaries);
    computeDraftFinalPay.returns([{ hoursBalance: 120 }]);

    const result = await DraftFinalPayHelper.getDraftFinalPay(query, credentials);

    expect(result).toBeDefined();
    expect(result).toEqual([{ hoursBalance: 120 }]);
    sinon.assert.calledWithExactly(
      getAuxiliariesToPay,
      {
        endDate: {
          $exists: true,
          $lte: moment(query.endDate).endOf('d').toDate(),
          $gte: moment(query.startDate).startOf('d').toDate(),
        },
      },
      moment('2019-05-31T23:59:59').endOf('d').toDate(),
      'finalpays',
      credentials.company._id
    );
    sinon.assert.calledWithExactly(
      computeDraftFinalPay,
      auxiliaries,
      { startDate: moment(query.startDate).startOf('d').toDate(), endDate: moment(query.endDate).endOf('d').toDate() },
      credentials
    );
  });
});
