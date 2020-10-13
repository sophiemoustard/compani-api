const expect = require('expect');
const sinon = require('sinon');
const moment = require('moment');
const { ObjectID } = require('mongodb');
const DraftFinalPayHelper = require('../../../src/helpers/draftFinalPay');
const DraftPayHelper = require('../../../src/helpers/draftPay');
const ContractHelper = require('../../../src/helpers/contracts');
const UtilsHelper = require('../../../src/helpers/utils');
const Company = require('../../../src/models/Company');
const Surcharge = require('../../../src/models/Surcharge');
const DistanceMatrix = require('../../../src/models/DistanceMatrix');
const FinalPay = require('../../../src/models/FinalPay');
const ContractRepository = require('../../../src/repositories/ContractRepository');
const EventRepository = require('../../../src/repositories/EventRepository');

require('sinon-mongoose');

describe('getContractMonthInfo', () => {
  let getDaysRatioBetweenTwoDates;
  let getContractInfo;
  beforeEach(() => {
    getDaysRatioBetweenTwoDates = sinon.stub(UtilsHelper, 'getDaysRatioBetweenTwoDates');
    getContractInfo = sinon.stub(ContractHelper, 'getContractInfo');
  });
  afterEach(() => {
    getDaysRatioBetweenTwoDates.restore();
    getContractInfo.restore();
  });

  it('should get contract month info', () => {
    const versions = [
      { startDate: '2019-01-01', endDate: '2019-05-04', weeklyHours: 18 },
      { endDate: '2019-05-17', startDate: '2019-05-04', weeklyHours: 24 },
    ];
    const contract = { versions, endDate: '2019-05-16' };
    const query = { startDate: '2019-05-06', endDate: '2019-05-10' };
    getDaysRatioBetweenTwoDates.returns(4);
    getContractInfo.returns({ contractHours: 12, workedDaysRatio: 1 / 4 });

    const result = DraftFinalPayHelper.getContractMonthInfo(contract, query);

    expect(result).toBeDefined();
    expect(result.contractHours).toBe(52);
    expect(result.workedDaysRatio).toBe(1 / 4);
    sinon.assert.calledWithExactly(
      getDaysRatioBetweenTwoDates,
      moment('2019-05-06').startOf('M').toDate(),
      moment('2019-05-06').endOf('M').toDate()
    );
    sinon.assert.calledWithExactly(
      getContractInfo,
      [{ endDate: '2019-05-17', startDate: '2019-05-04', weeklyHours: 24 }],
      query,
      4
    );
  });
});

describe('getDraftFinalPayByAuxiliary', () => {
  let computeBalance;
  let genericData;
  beforeEach(() => {
    computeBalance = sinon.stub(DraftPayHelper, 'computeBalance');
    genericData = sinon.stub(DraftPayHelper, 'genericData');
  });
  afterEach(() => {
    computeBalance.restore();
    genericData.restore();
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
      hoursCounter: 16,
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

    const result = await DraftFinalPayHelper.getDraftFinalPayByAuxiliary(aux, events, prevPay, company, query, [], []);
    expect(result).toBeDefined();
    expect(result).toEqual({
      ...computedPay,
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
    const credentials = { company: { _id: '1234567890' } };
    getAuxiliariesToPay.returns([]);
    const result = await DraftFinalPayHelper.getDraftFinalPay(query, credentials);

    expect(result).toBeDefined();
    expect(result).toEqual([]);
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
    const credentials = { company: { _id: new ObjectID() } };
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
    distanceMatrixMock
      .expects('find')
      .withExactArgs({ company: credentials.company._id })
      .chain('lean')
      .returns([]);
    findPay.returns(existingPay);
    getPreviousMonthPay.returns(prevPay);
    companyMock.expects('findOne').chain('lean').returns({});
    getDraftFinalPayByAuxiliary.returns({ hoursBalance: 120 });
    const result = await DraftFinalPayHelper.getDraftFinalPay(query, credentials);

    expect(result).toBeDefined();
    expect(result).toEqual([{ hoursBalance: 120 }]);
    companyMock.verify();
    surchargeMock.verify();
    distanceMatrixMock.verify();
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
