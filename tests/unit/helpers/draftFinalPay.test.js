const expect = require('expect');
const sinon = require('sinon');
const moment = require('moment');
const { ObjectID } = require('mongodb');
const DraftFinalPayHelper = require('../../../src/helpers/draftFinalPay');
const DraftPayHelper = require('../../../src/helpers/draftPay');
const Company = require('../../../src/models/Company');
const Surcharge = require('../../../src/models/Surcharge');
const DistanceMatrix = require('../../../src/models/DistanceMatrix');
const FinalPay = require('../../../src/models/FinalPay');
const ContractRepository = require('../../../src/repositories/ContractRepository');
const EventRepository = require('../../../src/repositories/EventRepository');

require('sinon-mongoose');

describe('getContractMonthInfo', () => {
  let getBusinessDaysCountBetweenTwoDates;
  let getMonthBusinessDaysCount;
  beforeEach(() => {
    getBusinessDaysCountBetweenTwoDates = sinon.stub(DraftPayHelper, 'getBusinessDaysCountBetweenTwoDates');
    getMonthBusinessDaysCount = sinon.stub(DraftPayHelper, 'getMonthBusinessDaysCount');
  });
  afterEach(() => {
    getBusinessDaysCountBetweenTwoDates.restore();
    getMonthBusinessDaysCount.restore();
  });

  it('Case 1. One version no sunday', () => {
    const contract = {
      versions: [
        { startDate: '2019-01-01', endDate: '2019-05-04', weeklyHours: 18 },
        { endDate: '2019-05-17', startDate: '2019-05-04', weeklyHours: 24 },
      ],
      endDate: '2019-05-16',
    };
    const query = { startDate: '2019-05-06', endDate: '2019-05-10' };
    getBusinessDaysCountBetweenTwoDates.returns(4);
    getMonthBusinessDaysCount.returns(16);

    const result = DraftFinalPayHelper.getContractMonthInfo(contract, query);

    expect(result).toBeDefined();
    expect(result.contractHours).toBeDefined();
    expect(result.contractHours).toBe(26);
    expect(result.workedDaysRatio).toBeDefined();
    expect(result.workedDaysRatio).toBe(1 / 4);
    sinon.assert.calledWith(getBusinessDaysCountBetweenTwoDates, moment('2019-05-06'), moment('2019-05-10'));
    sinon.assert.calledWith(getMonthBusinessDaysCount, '2019-05-06');
    sinon.assert.callCount(getBusinessDaysCountBetweenTwoDates, 1);
    sinon.assert.callCount(getMonthBusinessDaysCount, 1);
  });

  it('Case 2. One version and sunday included', () => {
    const contract = {
      versions: [
        { startDate: '2019-01-01', endDate: '2019-05-03', weeklyHours: 18 },
        { endDate: '2019-05-17', startDate: '2019-05-04', weeklyHours: 24 },
      ],
      endDate: '2019-05-16',
    };
    const query = { startDate: '2019-05-04', endDate: '2019-05-10' };
    getBusinessDaysCountBetweenTwoDates.withArgs(moment('2019-05-04').startOf('d'), moment('2019-05-10'));


    const result = DraftFinalPayHelper.getContractMonthInfo(contract, query);

    expect(result).toBeDefined();
    sinon.assert.calledWith(getBusinessDaysCountBetweenTwoDates, moment('2019-05-04').startOf('d'), moment('2019-05-10'));
    sinon.assert.calledWith(getMonthBusinessDaysCount, '2019-05-04');
    sinon.assert.callCount(getBusinessDaysCountBetweenTwoDates, 1);
    sinon.assert.callCount(getMonthBusinessDaysCount, 1);
  });

  it('Case 3. Multiple versions', () => {
    const contract = {
      versions: [
        { startDate: '2019-01-01', endDate: '2019-05-04', weeklyHours: 18 },
        { endDate: '2019-05-17', startDate: '2019-05-04', weeklyHours: 24 },
      ],
      endDate: '2019-05-16',
    };
    const query = { startDate: '2019-04-27', endDate: '2019-05-05' };

    const result = DraftFinalPayHelper.getContractMonthInfo(contract, query);

    expect(result).toBeDefined();
    sinon.assert.callCount(getBusinessDaysCountBetweenTwoDates, 2);
    sinon.assert.callCount(getMonthBusinessDaysCount, 1);
  });
});

describe('getDraftFinalPayByAuxiliary', () => {
  let computePay;
  beforeEach(() => {
    computePay = sinon.stub(DraftPayHelper, 'computePay');
  });
  afterEach(() => {
    computePay.restore();
  });

  it('should return draft pay for one auxiliary', async () => {
    const auxiliary = {
      _id: '1234567890',
      identity: { firstname: 'Hugo', lastname: 'Lloris' },
      sector: { name: 'La ruche' },
      contracts: [
        { status: 'contract_with_company', endDate: '2019-05-17T23:59:59', endReason: 'plus envie', endNotificationDate: '2019-05-12T23:59:59' },
      ],
      administrative: { mutualFund: { has: true } },
    };
    const events = { events: [[{ auxiliary: '1234567890' }]], absences: [] };
    const company = { rhConfig: { feeAmount: 37 } };
    const query = { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' };
    const prevPay = { hoursCounter: 10, diff: 2 };
    const computedPay = {
      auxiliaryId: '1234567890',
      auxiliary: { _id: '1234567890', identity: { firstname: 'Hugo', lastname: 'Lloris' }, sector: { name: 'La ruche' } },
      startDate: '2019-05-01T00:00:00',
      endDate: '2019-05-17T23:59:59',
      month: '05-2019',
      contractHours: 150,
      workedHours: 138,
      notSurchargedAndNotExempt: 15,
      surchargedAndNotExempt: 9,
      hoursBalance: 4,
      hoursCounter: 16,
      overtimeHours: 0,
      additionalHours: 0,
      mutual: false,
      transport: 26.54,
      otherFees: 29.6,
      bonus: 0,
    };
    computePay.returns(computedPay);

    const result = await DraftFinalPayHelper.getDraftFinalPayByAuxiliary(auxiliary, events, prevPay, company, query, [], []);
    expect(result).toBeDefined();
    expect(result).toEqual({
      ...computedPay,
      endDate: '2019-05-17T23:59:59',
      endNotificationDate: '2019-05-12T23:59:59',
      endReason: 'plus envie',
      compensation: 0,
    });
  });
});

describe('getDraftPay', () => {
  let getAuxiliariesToPay;
  let findPay;
  let getEventsToPay;
  let companyMock;
  let surchargeMock;
  let distanceMatrixMock;
  let getPreviousMonthPay;
  let getDraftFinalPayByAuxiliary;

  beforeEach(() => {
    getAuxiliariesToPay = sinon.stub(ContractRepository, 'getAuxiliariesToPay');
    getEventsToPay = sinon.stub(EventRepository, 'getEventsToPay');
    companyMock = sinon.mock(Company);
    surchargeMock = sinon.mock(Surcharge);
    distanceMatrixMock = sinon.mock(DistanceMatrix);
    findPay = sinon.stub(FinalPay, 'find');
    getPreviousMonthPay = sinon.stub(DraftPayHelper, 'getPreviousMonthPay');
    getDraftFinalPayByAuxiliary = sinon.stub(DraftFinalPayHelper, 'getDraftFinalPayByAuxiliary');
  });

  afterEach(() => {
    getAuxiliariesToPay.restore();
    getEventsToPay.restore();
    companyMock.restore();
    surchargeMock.restore();
    distanceMatrixMock.restore();
    findPay.restore();
    getPreviousMonthPay.restore();
    getDraftFinalPayByAuxiliary.restore();
  });

  it('should return an empty array if no auxiliary', async () => {
    const query = { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' };
    getAuxiliariesToPay.returns([]);
    const result = await DraftFinalPayHelper.getDraftFinalPay([], [], query);

    expect(result).toBeDefined();
    expect(result).toEqual([]);
  });

  it('should return draft pay', async () => {
    const query = { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' };
    const auxiliaryId = new ObjectID();
    const auxiliaries = [{ _id: auxiliaryId, sector: { name: 'Abeilles' } }];
    const payData = [
      {
        events: [{ _id: auxiliaryId, events: [{ startDate: '2019-05-03T10:00:00' }] }],
        absences: [{ _id: auxiliaryId, events: [{ startDate: '2019-05-06T10:00:00' }] }],
        auxiliary: { _id: auxiliaryId },
      },
      {
        events: [{ _id: new ObjectID(), events: [{ startDate: '2019-05-04T10:00:00' }] }],
        absences: [{ _id: new ObjectID(), events: [{ startDate: '2019-05-07T10:00:00' }] }],
        auxiliary: { _id: new ObjectID() },
      },
    ];
    const prevPay = [
      { auxiliary: auxiliaryId, hoursCounter: 23, diff: 2 },
      { auxiliary: new ObjectID(), hoursCounter: 25, diff: -3 },
    ];
    const existingPay = [{ auxiliary: new ObjectID() }];

    getAuxiliariesToPay.returns(auxiliaries);
    getEventsToPay.returns(payData);
    surchargeMock.expects('find').chain('lean').returns([]);
    distanceMatrixMock.expects('find').chain('lean').returns([]);
    findPay.returns(existingPay);
    getPreviousMonthPay.returns(prevPay);
    companyMock.expects('findOne').chain('lean').returns({});
    getDraftFinalPayByAuxiliary.returns({ hoursBalance: 120 });
    const result = await DraftFinalPayHelper.getDraftFinalPay(query);

    expect(result).toBeDefined();
    expect(result).toEqual([{ hoursBalance: 120 }]);
    companyMock.verify();
    surchargeMock.verify();
    distanceMatrixMock.verify();
    sinon.assert.calledWith(
      getDraftFinalPayByAuxiliary,
      { _id: auxiliaryId, sector: { name: 'Abeilles' } },
      {
        events: [{ _id: auxiliaryId, events: [{ startDate: '2019-05-03T10:00:00' }] }],
        absences: [{ _id: auxiliaryId, events: [{ startDate: '2019-05-06T10:00:00' }] }],
        auxiliary: { _id: auxiliaryId },
      },
      { auxiliary: auxiliaryId, hoursCounter: 23, diff: 2 },
      {},
      { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' },
      [],
      []
    );
  });
});
