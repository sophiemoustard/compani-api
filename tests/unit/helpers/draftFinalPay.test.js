const expect = require('expect');
const sinon = require('sinon');
const moment = require('moment');
const { ObjectID } = require('mongodb');
const DraftFinalPayHelper = require('../../../helpers/draftFinalPay');
const DraftPayHelper = require('../../../helpers/draftPay');
const Company = require('../../../models/Company');
const Surcharge = require('../../../models/Surcharge');
const DistanceMatrix = require('../../../models/DistanceMatrix');
const FinalPay = require('../../../models/FinalPay');
const ContractRepository = require('../../../repositories/ContractRepository');
const EventRepository = require('../../../repositories/EventRepository');

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
        { startDate: '2019-01-01', endDate: '2019-05-04', weeklyHours: 18 },
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
  let getPayFromEvents;
  let getPayFromAbsences;
  let getContractMonthInfo;
  let getTransportRefund;
  beforeEach(() => {
    getPayFromEvents = sinon.stub(DraftPayHelper, 'getPayFromEvents');
    getPayFromAbsences = sinon.stub(DraftPayHelper, 'getPayFromAbsences');
    getContractMonthInfo = sinon.stub(DraftFinalPayHelper, 'getContractMonthInfo');
    getTransportRefund = sinon.stub(DraftPayHelper, 'getTransportRefund');
  });
  afterEach(() => {
    getPayFromEvents.restore();
    getPayFromAbsences.restore();
    getContractMonthInfo.restore();
    getTransportRefund.restore();
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
    const events = [[{ auxiliary: '1234567890' }]];
    const absences = [];
    const company = { rhConfig: { feeAmount: 37 } };
    const query = { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' };
    const prevPay = { hoursCounter: 10, diff: 2 };

    getPayFromEvents.returns({ workedHours: 138, notSurchargedAndNotExempt: 15, surchargedAndNotExempt: 9 });
    getPayFromAbsences.returns(16);
    getContractMonthInfo.returns({ contractHours: 150, workedDaysRatio: 0.8 });
    getTransportRefund.returns(26.54);

    const result = await DraftFinalPayHelper.getDraftFinalPayByAuxiliary(auxiliary, events, absences, prevPay, company, query, [], []);
    expect(result).toBeDefined();
    expect(result).toEqual({
      auxiliaryId: '1234567890',
      auxiliary: { _id: '1234567890', identity: { firstname: 'Hugo', lastname: 'Lloris' }, sector: { name: 'La ruche' } },
      startDate: '2019-05-01T00:00:00',
      endDate: '2019-05-17T23:59:59',
      endNotificationDate: '2019-05-12T23:59:59',
      endReason: 'plus envie',
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
      compensation: 0,
    });
  });
});

describe('getDraftPay', () => {
  let getAuxiliariesFromContracts;
  let findPay;
  let getEventsToPay;
  let getAbsencesToPay;
  let companyMock;
  let findSurcharge;
  let findDistanceMatrix;
  let getPreviousMonthPay;
  let getDraftFinalPayByAuxiliary;

  beforeEach(() => {
    getAuxiliariesFromContracts = sinon.stub(ContractRepository, 'getAuxiliariesFromContracts');
    getEventsToPay = sinon.stub(EventRepository, 'getEventsToPay');
    getAbsencesToPay = sinon.stub(EventRepository, 'getAbsencesToPay');
    companyMock = sinon.mock(Company);
    findSurcharge = sinon.stub(Surcharge, 'find');
    findDistanceMatrix = sinon.stub(DistanceMatrix, 'find');
    findPay = sinon.stub(FinalPay, 'find');
    getPreviousMonthPay = sinon.stub(DraftPayHelper, 'getPreviousMonthPay');
    getDraftFinalPayByAuxiliary = sinon.stub(DraftFinalPayHelper, 'getDraftFinalPayByAuxiliary');
  });

  afterEach(() => {
    getAuxiliariesFromContracts.restore();
    getEventsToPay.restore();
    getAbsencesToPay.restore();
    companyMock.restore();
    findSurcharge.restore();
    findDistanceMatrix.restore();
    findPay.restore();
    getPreviousMonthPay.restore();
    getDraftFinalPayByAuxiliary.restore();
  });

  it('should return an empty array if no auxiliary', async () => {
    const query = { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' };
    getAuxiliariesFromContracts.returns([]);
    companyMock.expects('findOne').chain('lean');
    findPay.returns([]);
    const result = await DraftFinalPayHelper.getDraftFinalPay([], [], query);

    companyMock.verify();
    expect(result).toBeDefined();
    expect(result).toEqual([]);
  });

  it('should return draft pay', async () => {
    const query = { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' };
    const auxiliaryId = new ObjectID();
    const auxiliaries = [{ _id: auxiliaryId, sector: { name: 'Abeilles' } }];
    const events = [
      { _id: auxiliaryId, events: [{ startDate: '2019-05-03T10:00:00' }] },
      { _id: new ObjectID(), events: [{ startDate: '2019-05-04T10:00:00' }] },
    ];
    const absences = [
      { _id: auxiliaryId, events: [{ startDate: '2019-05-06T10:00:00' }] },
      { _id: new ObjectID(), events: [{ startDate: '2019-05-07T10:00:00' }] },
    ];
    const prevPay = [
      { auxiliary: auxiliaryId, hoursCounter: 23, diff: 2 },
      { auxiliary: new ObjectID(), hoursCounter: 25, diff: -3 },
    ];
    const existingPay = [{ auxiliary: new ObjectID() }];

    getAuxiliariesFromContracts.returns(auxiliaries);
    getEventsToPay.returns(events);
    getAbsencesToPay.returns(absences);
    findSurcharge.returns([]);
    findDistanceMatrix.returns([]);
    findPay.returns(existingPay);
    getPreviousMonthPay.returns(prevPay);
    companyMock.expects('findOne').chain('lean').returns({});
    getDraftFinalPayByAuxiliary.returns({ hoursBalance: 120 });
    const result = await DraftFinalPayHelper.getDraftFinalPay(query);

    expect(result).toBeDefined();
    expect(result).toEqual([{ hoursBalance: 120 }]);
    companyMock.verify();
    sinon.assert.calledWith(
      getDraftFinalPayByAuxiliary,
      { _id: auxiliaryId, sector: { name: 'Abeilles' } },
      [{ startDate: '2019-05-03T10:00:00' }],
      [{ startDate: '2019-05-06T10:00:00' }],
      { auxiliary: auxiliaryId, hoursCounter: 23, diff: 2 },
      {},
      { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' },
      [],
      []
    );
  });

  it('should not compute draft pay if pay already exist in db', async () => {
    const query = { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' };
    const auxiliaryId = new ObjectID();
    const auxiliaries = [{ _id: auxiliaryId, sector: { name: 'Abeilles' } }];
    const events = [
      { _id: auxiliaryId, events: [{ startDate: '2019-05-03T10:00:00' }] },
    ];
    const existingPay = [{ auxiliary: auxiliaryId }];

    getAuxiliariesFromContracts.returns(auxiliaries);
    getEventsToPay.returns(events);
    getAbsencesToPay.returns([]);
    findSurcharge.returns([]);
    findDistanceMatrix.returns([]);
    findPay.returns(existingPay);
    getPreviousMonthPay.returns([]);
    companyMock.expects('findOne').chain('lean').returns({});

    const result = await DraftFinalPayHelper.getDraftFinalPay(query);

    expect(result).toBeDefined();
    sinon.assert.notCalled(getDraftFinalPayByAuxiliary);
  });
});
