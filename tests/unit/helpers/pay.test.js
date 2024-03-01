const { expect } = require('expect');
const sinon = require('sinon');
const moment = require('moment');
const Boom = require('@hapi/boom');
const { ObjectId } = require('mongodb');
const SinonMongoose = require('../sinonMongoose');
const Pay = require('../../../src/models/Pay');
const User = require('../../../src/models/User');
const PayHelper = require('../../../src/helpers/pay');
const DraftPayHelper = require('../../../src/helpers/draftPay');
const DraftFinalPayHelper = require('../../../src/helpers/draftFinalPay');
const SectorHistoryRepository = require('../../../src/repositories/SectorHistoryRepository');
const SectorHistoryHelper = require('../../../src/helpers/sectorHistories');
const FinalPay = require('../../../src/models/FinalPay');

describe('formatSurchargeDetail', () => {
  it('should return empty array if empty object given', () => {
    const result = PayHelper.formatSurchargeDetail({});
    expect(result).toEqual([]);
  });

  it('should format surcharge detail', () => {
    const detail = {
      1234567890: { toto: 2, tata: 3 },
      qwertyuiop: { pay: 7, contract: 9 },
    };
    const result = PayHelper.formatSurchargeDetail(detail);
    expect(result).toEqual([
      { planId: '1234567890', toto: 2, tata: 3 },
      { planId: 'qwertyuiop', pay: 7, contract: 9 },
    ]);
  });
});

describe('formatPay', () => {
  const companyId = new ObjectId();
  let formatSurchargeDetail;
  beforeEach(() => {
    formatSurchargeDetail = sinon.stub(PayHelper, 'formatSurchargeDetail');
  });
  afterEach(() => {
    formatSurchargeDetail.restore();
  });

  it('should return only company if empty object given', () => {
    const result = PayHelper.formatPay({}, companyId);
    expect(result).toEqual({ company: companyId });
    sinon.assert.notCalled(formatSurchargeDetail);
  });

  it('should format pay with surchargedAndExemptDetails', () => {
    const draftPay = { _id: 'toto', surchargedAndExemptDetails: { evenings: 3 } };
    formatSurchargeDetail.returns({ test: 1 });

    const result = PayHelper.formatPay(draftPay, companyId);
    expect(result).toEqual({
      company: companyId,
      _id: 'toto',
      surchargedAndExemptDetails: { test: 1 },
    });
    sinon.assert.calledWithExactly(formatSurchargeDetail, draftPay.surchargedAndExemptDetails);
  });

  it('should format pay with diff', () => {
    const draftPay = { _id: 'toto', diff: { surchargedAndExemptDetails: { evenings: 3 } } };
    formatSurchargeDetail.returns({ test: 1 });

    const result = PayHelper.formatPay(draftPay, companyId);
    expect(result).toEqual({
      company: companyId,
      _id: 'toto',
      diff: { surchargedAndExemptDetails: { test: 1 } },
    });
    sinon.assert.calledWithExactly(formatSurchargeDetail, draftPay.diff.surchargedAndExemptDetails);
  });

  it('should format pay with both', () => {
    const draftPay = {
      _id: 'toto',
      diff: { surchargedAndExemptDetails: { evenings: 3 } },
      surchargedAndExemptDetails: { custom: 3 },
    };
    formatSurchargeDetail.returns({ test: 1 });

    const result = PayHelper.formatPay(draftPay, companyId);
    expect(result).toEqual({
      company: companyId,
      _id: 'toto',
      diff: { surchargedAndExemptDetails: { test: 1 } },
      surchargedAndExemptDetails: { test: 1 },
    });
    sinon.assert.calledWithExactly(formatSurchargeDetail, draftPay.surchargedAndExemptDetails);
    sinon.assert.calledWithExactly(formatSurchargeDetail, draftPay.diff.surchargedAndExemptDetails);
  });
});

describe('getContract', () => {
  const startDate = '2019-12-12';
  const endDate = '2019-12-25';

  it('should return a contract if it has no endDate', async () => {
    const contracts = [{ startDate: '2019-10-10' }];
    const result = PayHelper.getContract(contracts, startDate, endDate);
    expect(result).toBeDefined();
    expect(result).toEqual({ startDate: '2019-10-10' });
  });

  it('should return a contract if it has a endDate which is after our query startDate', async () => {
    const contracts = [{ startDate: '2019-10-10', endDate: '2019-12-15' }];
    const result = PayHelper.getContract(contracts, startDate, endDate);
    expect(result).toBeDefined();
    expect(result).toEqual({ startDate: '2019-10-10', endDate: '2019-12-15' });
  });

  it('should return undefined if no contract', async () => {
    const contracts = [];
    const result = PayHelper.getContract(contracts, startDate, endDate);
    expect(result).toBeUndefined();
  });

  it('should return no contract if the contract has not yet started', async () => {
    const contracts = [{ startDate: '2020-01-10' }];
    const result = PayHelper.getContract(contracts, startDate, endDate);
    expect(result).toBeUndefined();
  });

  it('should return no contract if the contract has a endDate which is before our query start date', async () => {
    const contracts = [{ startDate: '2019-10-10', endDate: '2019-10-12' }];
    const result = PayHelper.getContract(contracts, startDate, endDate);
    expect(result).toBeUndefined();
  });
});

describe('hoursBalanceDetail', () => {
  const credentials = { company: { _id: new ObjectId() } };
  const month = '01-2020';
  const startDate = moment(month, 'MM-YYYY').startOf('M').toDate();
  const endDate = moment(month, 'MM-YYYY').endOf('M').toDate();

  let hoursBalanceDetailBySectorStub;
  let hoursBalanceDetailByAuxiliary;

  beforeEach(() => {
    hoursBalanceDetailBySectorStub = sinon.stub(PayHelper, 'hoursBalanceDetailBySector');
    hoursBalanceDetailByAuxiliary = sinon.stub(PayHelper, 'hoursBalanceDetailByAuxiliary');
  });
  afterEach(() => {
    hoursBalanceDetailBySectorStub.restore();
    hoursBalanceDetailByAuxiliary.restore();
  });

  it('should call hoursBalanceDetailBySector', async () => {
    const query = { sector: new ObjectId(), month };
    hoursBalanceDetailBySectorStub.returns({ data: 'ok' });

    const result = await PayHelper.hoursBalanceDetail(query, credentials);

    expect(result).toEqual({ data: 'ok' });
    sinon.assert.notCalled(hoursBalanceDetailByAuxiliary);
    sinon.assert.calledWithExactly(hoursBalanceDetailBySectorStub, query.sector, startDate, endDate, credentials);
  });

  it('should call hoursBalanceDetailByAuxiliary', async () => {
    const query = { auxiliary: new ObjectId(), month };
    hoursBalanceDetailByAuxiliary.returns({ data: 'ok' });

    const result = await PayHelper.hoursBalanceDetail(query, credentials);

    expect(result).toEqual({ data: 'ok' });
    sinon.assert.calledWithExactly(hoursBalanceDetailByAuxiliary, query.auxiliary, startDate, endDate, credentials);
    sinon.assert.notCalled(hoursBalanceDetailBySectorStub);
  });
});

describe('hoursBalanceDetailByAuxiliary', () => {
  const auxiliaryId = new ObjectId();
  const month = '09-2022';
  const startDate = '2022-09-01T00:00:00';
  const endDate = '2022-09-30T23:59:59';
  const query = { startDate, endDate };
  const prevMonth = '08-2022';
  const companyId = new ObjectId();
  const credentials = { company: { _id: companyId } };
  const prevPay = { _id: new ObjectId() };

  let payFindOne;
  let finalPayFindOne;
  let userFindOne;
  let getAuxiliarySectors;
  let getContractStub;
  let computeDraftPay;
  let computeDraftFinalPay;

  beforeEach(() => {
    payFindOne = sinon.stub(Pay, 'findOne');
    finalPayFindOne = sinon.stub(FinalPay, 'findOne');
    userFindOne = sinon.stub(User, 'findOne');
    getAuxiliarySectors = sinon.stub(SectorHistoryHelper, 'getAuxiliarySectors');
    getContractStub = sinon.stub(PayHelper, 'getContract');
    computeDraftPay = sinon.stub(DraftPayHelper, 'computeDraftPay');
    computeDraftFinalPay = sinon.stub(DraftFinalPayHelper, 'computeDraftFinalPay');
  });

  afterEach(() => {
    payFindOne.restore();
    finalPayFindOne.restore();
    userFindOne.restore();
    getAuxiliarySectors.restore();
    getContractStub.restore();
    computeDraftPay.restore();
    computeDraftFinalPay.restore();
  });

  it('should return draftPay', async () => {
    const sectorId = new ObjectId();
    const auxiliary = { _id: auxiliaryId, contracts: [{ startDate: '2018-11-01' }] };
    const contract = { startDate: '2018-11-12' };
    const draft = { name: 'brouillon' };

    getAuxiliarySectors.returns([sectorId.toHexString()]);
    getContractStub.returns(contract);
    computeDraftPay.returns([draft]);
    payFindOne.onCall(0).returns(SinonMongoose.stubChainedQueries(null, ['lean']));
    payFindOne.onCall(1).returns(SinonMongoose.stubChainedQueries(prevPay, ['lean']));
    finalPayFindOne.returns(SinonMongoose.stubChainedQueries(null, ['lean']));
    userFindOne.returns(SinonMongoose.stubChainedQueries(auxiliary));

    const result = await PayHelper.hoursBalanceDetailByAuxiliary(auxiliaryId, startDate, endDate, credentials);

    expect(result).toEqual({ ...draft, sectors: [sectorId.toHexString()], counterAndDiffRelevant: true });
    sinon.assert.calledWithExactly(getAuxiliarySectors, auxiliaryId, companyId, startDate, endDate);
    sinon.assert.calledWithExactly(getContractStub, auxiliary.contracts, startDate, endDate);
    sinon.assert.calledWithExactly(computeDraftPay, [{ ...auxiliary, prevPay }], query, credentials);
    sinon.assert.notCalled(computeDraftFinalPay);
    SinonMongoose.calledWithExactly(
      payFindOne,
      [{ query: 'findOne', args: [{ auxiliary: auxiliaryId, month }] }, { query: 'lean' }],
      0
    );
    SinonMongoose.calledOnceWithExactly(
      finalPayFindOne,
      [{ query: 'findOne', args: [{ auxiliary: auxiliaryId, month }] }, { query: 'lean' }]
    );
    SinonMongoose.calledWithExactly(
      payFindOne,
      [{ query: 'findOne', args: [{ auxiliary: auxiliaryId, month: prevMonth }] }, { query: 'lean' }],
      1
    );
    SinonMongoose.calledOnceWithExactly(
      userFindOne,
      [
        { query: 'findOne', args: [{ _id: auxiliaryId }] },
        { query: 'populate', args: ['contracts'] },
        { query: 'lean' },
      ]
    );
  });

  it('should return draftFinalPay if contract ends on period', async () => {
    const sectorId = new ObjectId();
    const auxiliary = { _id: auxiliaryId, contracts: [{ startDate: '2018-11-01' }] };
    const contract = { startDate: '2018-11-12', endDate: '2022-09-27' };
    const draft = { name: 'brouillon' };

    getAuxiliarySectors.returns([sectorId.toHexString()]);
    getContractStub.returns(contract);
    computeDraftFinalPay.returns([draft]);
    payFindOne.onCall(0).returns(SinonMongoose.stubChainedQueries(null, ['lean']));
    payFindOne.onCall(1).returns(SinonMongoose.stubChainedQueries(prevPay, ['lean']));
    finalPayFindOne.returns(SinonMongoose.stubChainedQueries(null, ['lean']));
    userFindOne.returns(SinonMongoose.stubChainedQueries(auxiliary));

    const result = await PayHelper.hoursBalanceDetailByAuxiliary(auxiliaryId, startDate, endDate, credentials);

    expect(result).toEqual({ ...draft, sectors: [sectorId.toHexString()], counterAndDiffRelevant: true });
    sinon.assert.calledWithExactly(getAuxiliarySectors, auxiliaryId, companyId, startDate, endDate);
    sinon.assert.calledWithExactly(getContractStub, auxiliary.contracts, startDate, endDate);
    sinon.assert.calledWithExactly(computeDraftFinalPay, [{ ...auxiliary, prevPay }], query, credentials);
    sinon.assert.notCalled(computeDraftPay);
    SinonMongoose.calledWithExactly(
      payFindOne,
      [{ query: 'findOne', args: [{ auxiliary: auxiliaryId, month }] }, { query: 'lean' }],
      0
    );
    SinonMongoose.calledOnceWithExactly(
      finalPayFindOne,
      [{ query: 'findOne', args: [{ auxiliary: auxiliaryId, month }] }, { query: 'lean' }]
    );
    SinonMongoose.calledWithExactly(
      payFindOne,
      [{ query: 'findOne', args: [{ auxiliary: auxiliaryId, month: prevMonth }] }, { query: 'lean' }],
      1
    );
    SinonMongoose.calledOnceWithExactly(
      userFindOne,
      [
        { query: 'findOne', args: [{ _id: auxiliaryId }] },
        { query: 'populate', args: ['contracts'] },
        { query: 'lean' },
      ]
    );
  });

  it('should return draftPay with counterAndDiffRelevant if contract has just started', async () => {
    const sectorId = new ObjectId();
    const auxiliary = { _id: auxiliaryId, contracts: { startDate: '2018-11-01' } };
    const contract = { startDate: '2022-09-12T00:00:00' };
    const draft = { name: 'brouillon' };

    getAuxiliarySectors.returns([sectorId.toHexString()]);
    getContractStub.returns(contract);
    computeDraftPay.returns([draft]);
    payFindOne.onCall(0).returns(SinonMongoose.stubChainedQueries(null, ['lean']));
    payFindOne.onCall(1).returns(SinonMongoose.stubChainedQueries(null, ['lean']));
    finalPayFindOne.returns(SinonMongoose.stubChainedQueries(null, ['lean']));
    userFindOne.returns(SinonMongoose.stubChainedQueries(auxiliary));

    const result = await PayHelper.hoursBalanceDetailByAuxiliary(auxiliaryId, startDate, endDate, credentials);

    expect(result).toEqual({ ...draft, sectors: [sectorId.toHexString()], counterAndDiffRelevant: true });

    sinon.assert.calledOnceWithExactly(getAuxiliarySectors, auxiliaryId, companyId, startDate, endDate);
    sinon.assert.calledOnceWithExactly(getContractStub, auxiliary.contracts, startDate, endDate);
    sinon.assert.calledOnceWithExactly(computeDraftPay, [{ ...auxiliary, prevPay: null }], query, credentials);
    sinon.assert.notCalled(computeDraftFinalPay);
    SinonMongoose.calledWithExactly(
      payFindOne,
      [{ query: 'findOne', args: [{ auxiliary: auxiliaryId, month }] }, { query: 'lean' }],
      0
    );
    SinonMongoose.calledWithExactly(
      payFindOne,
      [{ query: 'findOne', args: [{ month: prevMonth, auxiliary: auxiliaryId }] }, { query: 'lean' }],
      1
    );
    SinonMongoose.calledOnceWithExactly(
      finalPayFindOne,
      [{ query: 'findOne', args: [{ auxiliary: auxiliaryId, month }] }, { query: 'lean' }]
    );
    SinonMongoose.calledOnceWithExactly(
      userFindOne,
      [
        { query: 'findOne', args: [{ _id: auxiliaryId }] },
        { query: 'populate', args: ['contracts'] },
        { query: 'lean' },
      ]
    );
  });

  it('should return draftPay with counterAndDiffRelevant to false if no prevPay and not firstmonth', async () => {
    const sectorId = new ObjectId();
    const auxiliary = { _id: auxiliaryId, contracts: { startDate: '2018-11-01' } };
    const contract = { startDate: '2018-12-01' };
    const draft = { name: 'brouillon' };

    getAuxiliarySectors.returns([sectorId.toHexString()]);
    getContractStub.returns(contract);
    computeDraftPay.returns([draft]);
    payFindOne.onCall(0).returns(SinonMongoose.stubChainedQueries(null, ['lean']));
    payFindOne.onCall(1).returns(SinonMongoose.stubChainedQueries(null, ['lean']));
    finalPayFindOne.returns(SinonMongoose.stubChainedQueries(null, ['lean']));
    userFindOne.returns(SinonMongoose.stubChainedQueries(auxiliary));

    const result = await PayHelper.hoursBalanceDetailByAuxiliary(auxiliaryId, startDate, endDate, credentials);

    expect(result).toEqual({ ...draft, sectors: [sectorId.toHexString()], counterAndDiffRelevant: false });

    sinon.assert.calledOnceWithExactly(getAuxiliarySectors, auxiliaryId, companyId, startDate, endDate);
    sinon.assert.calledOnceWithExactly(getContractStub, auxiliary.contracts, startDate, endDate);
    sinon.assert.calledOnceWithExactly(computeDraftPay, [{ ...auxiliary, prevPay: null }], query, credentials);
    sinon.assert.notCalled(computeDraftFinalPay);
    SinonMongoose.calledWithExactly(
      payFindOne,
      [{ query: 'findOne', args: [{ auxiliary: auxiliaryId, month }] }, { query: 'lean' }],
      0
    );
    SinonMongoose.calledWithExactly(
      payFindOne,
      [{ query: 'findOne', args: [{ month: prevMonth, auxiliary: auxiliaryId }] }, { query: 'lean' }],
      1
    );
    SinonMongoose.calledOnceWithExactly(
      finalPayFindOne,
      [{ query: 'findOne', args: [{ auxiliary: auxiliaryId, month }] }, { query: 'lean' }]
    );
    SinonMongoose.calledOnceWithExactly(
      userFindOne,
      [
        { query: 'findOne', args: [{ _id: auxiliaryId }] },
        { query: 'populate', args: ['contracts'] },
        { query: 'lean' },
      ]
    );
  });

  it('should return pay if it exists', async () => {
    const pay = { _id: new ObjectId() };
    const sectorId = new ObjectId();

    getAuxiliarySectors.returns([sectorId.toHexString()]);
    payFindOne.returns(SinonMongoose.stubChainedQueries(pay, ['lean']));

    const result = await PayHelper.hoursBalanceDetailByAuxiliary(auxiliaryId, startDate, endDate, credentials);

    expect(result).toEqual({ ...pay, sectors: [sectorId.toHexString()], counterAndDiffRelevant: true });

    sinon.assert.calledWithExactly(getAuxiliarySectors, auxiliaryId, companyId, startDate, endDate);
    sinon.assert.notCalled(getContractStub);
    sinon.assert.notCalled(computeDraftPay);
    sinon.assert.notCalled(computeDraftFinalPay);
    sinon.assert.notCalled(userFindOne);
    sinon.assert.notCalled(finalPayFindOne);
    SinonMongoose.calledOnceWithExactly(
      payFindOne,
      [{ query: 'findOne', args: [{ auxiliary: auxiliaryId, month }] }, { query: 'lean' }]
    );
  });

  it('should return final pay if it exists', async () => {
    const pay = { _id: new ObjectId() };
    const sectorId = new ObjectId();

    getAuxiliarySectors.returns([sectorId.toHexString()]);
    payFindOne.returns(SinonMongoose.stubChainedQueries(null, ['lean']));
    finalPayFindOne.returns(SinonMongoose.stubChainedQueries(pay, ['lean']));

    const result = await PayHelper.hoursBalanceDetailByAuxiliary(auxiliaryId, startDate, endDate, credentials);

    expect(result).toEqual({ ...pay, sectors: [sectorId.toHexString()], counterAndDiffRelevant: true });

    sinon.assert.calledWithExactly(getAuxiliarySectors, auxiliaryId, companyId, startDate, endDate);
    sinon.assert.notCalled(getContractStub);
    sinon.assert.notCalled(computeDraftPay);
    sinon.assert.notCalled(computeDraftFinalPay);
    sinon.assert.notCalled(userFindOne);
    SinonMongoose.calledOnceWithExactly(
      payFindOne,
      [{ query: 'findOne', args: [{ auxiliary: auxiliaryId, month }] }, { query: 'lean' }]
    );
    SinonMongoose.calledOnceWithExactly(
      finalPayFindOne,
      [{ query: 'findOne', args: [{ auxiliary: auxiliaryId, month }] }, { query: 'lean' }]
    );
  });

  it('should return 400 if no contract', async () => {
    const sectorId = new ObjectId();
    const auxiliary = { _id: auxiliaryId, contracts: { startDate: '2018-11-01' } };
    try {
      getAuxiliarySectors.returns([sectorId.toHexString()]);
      getContractStub.returns(null);
      payFindOne.returns(SinonMongoose.stubChainedQueries(null, ['lean']));
      finalPayFindOne.returns(SinonMongoose.stubChainedQueries(null, ['lean']));
      userFindOne.returns(SinonMongoose.stubChainedQueries(auxiliary));

      await PayHelper.hoursBalanceDetailByAuxiliary(auxiliaryId, startDate, endDate, credentials);
    } catch (e) {
      expect(e).toEqual(Boom.badRequest());

      sinon.assert.calledWithExactly(getAuxiliarySectors, auxiliaryId, companyId, startDate, endDate);
      sinon.assert.calledWithExactly(getContractStub, auxiliary.contracts, startDate, endDate);
      SinonMongoose.calledOnceWithExactly(
        payFindOne,
        [{ query: 'findOne', args: [{ auxiliary: auxiliaryId, month }] }, { query: 'lean' }]
      );
      SinonMongoose.calledOnceWithExactly(
        finalPayFindOne,
        [{ query: 'findOne', args: [{ auxiliary: auxiliaryId, month }] }, { query: 'lean' }]
      );
      SinonMongoose.calledOnceWithExactly(
        userFindOne,
        [
          { query: 'findOne', args: [{ _id: auxiliaryId }] },
          { query: 'populate', args: ['contracts'] },
          { query: 'lean' },
        ]
      );
    } finally {
      sinon.assert.notCalled(computeDraftPay);
      sinon.assert.notCalled(computeDraftFinalPay);
    }
  });

  it('should return null if no draftPay', async () => {
    const sectorId = new ObjectId();
    const auxiliary = { _id: auxiliaryId, contracts: { startDate: '2018-11-01' } };
    const contract = { startDate: '2018-11-12' };

    getAuxiliarySectors.returns([sectorId.toHexString()]);
    computeDraftPay.returns([]);
    getContractStub.returns(contract);
    payFindOne.onCall(0).returns(SinonMongoose.stubChainedQueries(null, ['lean']));
    payFindOne.onCall(1).returns(SinonMongoose.stubChainedQueries(prevPay, ['lean']));
    finalPayFindOne.returns(SinonMongoose.stubChainedQueries(null, ['lean']));
    userFindOne.returns(SinonMongoose.stubChainedQueries(auxiliary));

    const result = await PayHelper.hoursBalanceDetailByAuxiliary(auxiliaryId, startDate, endDate, credentials);

    expect(result).toBe(null);

    sinon.assert.calledWithExactly(getAuxiliarySectors, auxiliaryId, companyId, startDate, endDate);
    sinon.assert.calledWithExactly(getContractStub, auxiliary.contracts, startDate, endDate);
    sinon.assert.calledWithExactly(computeDraftPay, [{ ...auxiliary, prevPay }], query, credentials);
    SinonMongoose.calledWithExactly(
      payFindOne,
      [{ query: 'findOne', args: [{ auxiliary: auxiliaryId, month }] }, { query: 'lean' }],
      0
    );
    SinonMongoose.calledWithExactly(
      payFindOne,
      [{ query: 'findOne', args: [{ month: prevMonth, auxiliary: auxiliaryId }] }, { query: 'lean' }],
      1
    );
    SinonMongoose.calledOnceWithExactly(
      finalPayFindOne,
      [{ query: 'findOne', args: [{ auxiliary: auxiliaryId, month }] }, { query: 'lean' }]
    );
    SinonMongoose.calledOnceWithExactly(
      userFindOne,
      [
        { query: 'findOne', args: [{ _id: auxiliaryId }] },
        { query: 'populate', args: ['contracts'] },
        { query: 'lean' },
      ]
    );
  });
});

describe('hoursBalanceDetailBySector', () => {
  const credentials = { company: { _id: new ObjectId() } };
  const month = '01-2020';
  const startDate = moment(month, 'MM-YYYY').startOf('M').toDate();
  const endDate = moment(month, 'MM-YYYY').endOf('M').toDate();

  let getUsersFromSectorHistoriesStub;
  let getContractStub;
  let hoursBalanceDetailByAuxiliary;
  let userFind;
  beforeEach(() => {
    getUsersFromSectorHistoriesStub = sinon.stub(SectorHistoryRepository, 'getUsersFromSectorHistories');
    getContractStub = sinon.stub(PayHelper, 'getContract');
    hoursBalanceDetailByAuxiliary = sinon.stub(PayHelper, 'hoursBalanceDetailByAuxiliary');
    userFind = sinon.stub(User, 'find');
  });
  afterEach(() => {
    getUsersFromSectorHistoriesStub.restore();
    getContractStub.restore();
    hoursBalanceDetailByAuxiliary.restore();
    userFind.restore();
  });

  it('should return an empty array if no information', async () => {
    const query = { sector: new ObjectId() };
    getUsersFromSectorHistoriesStub.returns([]);
    userFind.returns(SinonMongoose.stubChainedQueries([]));

    const result = await PayHelper.hoursBalanceDetailBySector(query.sector, startDate, endDate, credentials);

    expect(result).toEqual([]);
    sinon.assert.calledWithExactly(
      getUsersFromSectorHistoriesStub,
      startDate,
      endDate,
      [query.sector],
      credentials.company._id
    );
    SinonMongoose.calledOnceWithExactly(
      userFind,
      [
        { query: 'find', args: [{ _id: { $in: [] } }, { identity: 1, picture: 1 }] },
        { query: 'populate', args: ['contracts'] },
        { query: 'lean', args: [] },
      ]
    );
  });

  it('should return the info for a sector', async () => {
    const query = { sector: new ObjectId() };
    const auxiliaryId = new ObjectId();
    const usersFromSectorHistories = [{ auxiliaryId }];
    const contract = { _id: 'poiuytre' };

    userFind.returns(SinonMongoose.stubChainedQueries([
      { _id: auxiliaryId, contracts: [contract], identity: 'test', picture: 'toto' },
    ]));
    getContractStub.returns(contract);
    getUsersFromSectorHistoriesStub.returns(usersFromSectorHistories);
    hoursBalanceDetailByAuxiliary.returns({ auxiliary: auxiliaryId, hours: 10 });

    const result = await PayHelper.hoursBalanceDetailBySector(query.sector, startDate, endDate, credentials);

    expect(result).toEqual([{ auxiliaryId, auxiliary: auxiliaryId, hours: 10, identity: 'test', picture: 'toto' }]);
    sinon.assert.calledWithExactly(
      getUsersFromSectorHistoriesStub,
      startDate,
      endDate,
      [query.sector],
      credentials.company._id
    );
    sinon.assert.calledWithExactly(getContractStub, [contract], startDate, endDate);
    sinon.assert.calledWithExactly(hoursBalanceDetailByAuxiliary, auxiliaryId, startDate, endDate, credentials);
    SinonMongoose.calledOnceWithExactly(
      userFind,
      [
        { query: 'find', args: [{ _id: { $in: [auxiliaryId] } }, { identity: 1, picture: 1 }] },
        { query: 'populate', args: ['contracts'] },
        { query: 'lean', args: [] },
      ]
    );
  });

  it('should return the info for many sectors', async () => {
    const query = { sector: [new ObjectId(), new ObjectId()] };
    const auxiliaryIds = [new ObjectId(), new ObjectId()];
    const usersFromSectorHistories = [{ auxiliaryId: auxiliaryIds[0] }, { auxiliaryId: auxiliaryIds[1] }];
    const contracts = [{ _id: auxiliaryIds[0] }, { _id: auxiliaryIds[1] }];

    getUsersFromSectorHistoriesStub.returns(usersFromSectorHistories);
    userFind.returns(SinonMongoose.stubChainedQueries([
      { _id: auxiliaryIds[0], contracts: [contracts[0]], identity: 'test', picture: 'toto' },
      { _id: auxiliaryIds[1], contracts: [contracts[1]], identity: 'test2', picture: 'toto2' },
    ]));
    getContractStub.onCall(0).returns(contracts[0]);
    getContractStub.onCall(1).returns(contracts[1]);
    hoursBalanceDetailByAuxiliary.onCall(0).returns({ auxiliary: auxiliaryIds[0], hours: 10 });
    hoursBalanceDetailByAuxiliary.onCall(1).returns({ auxiliary: auxiliaryIds[1], hours: 16 });

    const result = await PayHelper.hoursBalanceDetailBySector(query.sector, startDate, endDate, credentials);

    expect(result).toEqual([
      { auxiliaryId: auxiliaryIds[0], auxiliary: auxiliaryIds[0], hours: 10, identity: 'test', picture: 'toto' },
      { auxiliaryId: auxiliaryIds[1], auxiliary: auxiliaryIds[1], hours: 16, identity: 'test2', picture: 'toto2' },
    ]);
    sinon.assert.calledWithExactly(
      getUsersFromSectorHistoriesStub,
      startDate,
      endDate,
      query.sector,
      credentials.company._id
    );
    sinon.assert.calledWithExactly(getContractStub.getCall(0), [contracts[0]], startDate, endDate);
    sinon.assert.calledWithExactly(getContractStub.getCall(1), [contracts[1]], startDate, endDate);
    sinon.assert.calledWithExactly(
      hoursBalanceDetailByAuxiliary.getCall(0),
      auxiliaryIds[0],
      startDate,
      endDate,
      credentials
    );
    sinon.assert.calledWithExactly(
      hoursBalanceDetailByAuxiliary.getCall(1),
      auxiliaryIds[1],
      startDate,
      endDate,
      credentials
    );
    SinonMongoose.calledOnceWithExactly(
      userFind,
      [
        { query: 'find', args: [{ _id: { $in: auxiliaryIds } }, { identity: 1, picture: 1 }] },
        { query: 'populate', args: ['contracts'] },
        { query: 'lean', args: [] },
      ]
    );
  });

  it('should not take into account if auxiliary does not have contract', async () => {
    const query = { sector: new ObjectId() };
    const auxiliaryId = new ObjectId();
    const usersFromSectorHistories = [{ auxiliaryId }];
    getUsersFromSectorHistoriesStub.returns(usersFromSectorHistories);
    userFind.returns(SinonMongoose.stubChainedQueries([{ _id: auxiliaryId, name: 'titi' }]));

    const result = await PayHelper.hoursBalanceDetailBySector(query.sector, startDate, endDate, credentials);

    expect(result).toEqual([]);
    sinon.assert.calledWithExactly(
      getUsersFromSectorHistoriesStub,
      startDate,
      endDate,
      [query.sector],
      credentials.company._id
    );
    sinon.assert.notCalled(getContractStub);
    sinon.assert.notCalled(hoursBalanceDetailByAuxiliary);
    SinonMongoose.calledOnceWithExactly(
      userFind,
      [
        { query: 'find', args: [{ _id: { $in: [auxiliaryId] } }, { identity: 1, picture: 1 }] },
        { query: 'populate', args: ['contracts'] },
        { query: 'lean', args: [] },
      ]
    );
  });

  it('should not take into account if auxiliary does not currently have contract', async () => {
    const query = { sector: new ObjectId() };
    const auxiliaryId = new ObjectId();
    const usersFromSectorHistories = [{ auxiliaryId }];
    const contract = { _id: 'poiuytr' };

    getUsersFromSectorHistoriesStub.returns(usersFromSectorHistories);
    userFind.returns(SinonMongoose.stubChainedQueries([{ contracts: [contract] }]));
    getContractStub.returns();

    const result = await PayHelper.hoursBalanceDetailBySector(query.sector, startDate, endDate, credentials);

    expect(result).toEqual([]);
    sinon.assert.calledWithExactly(
      getUsersFromSectorHistoriesStub,
      startDate,
      endDate,
      [query.sector],
      credentials.company._id
    );
    sinon.assert.calledWithExactly(getContractStub, [contract], startDate, endDate);
    sinon.assert.notCalled(hoursBalanceDetailByAuxiliary);
    SinonMongoose.calledOnceWithExactly(
      userFind,
      [
        { query: 'find', args: [{ _id: { $in: [auxiliaryId] } }, { identity: 1, picture: 1 }] },
        { query: 'populate', args: ['contracts'] },
        { query: 'lean', args: [] },
      ]
    );
  });
});
