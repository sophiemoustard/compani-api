const expect = require('expect');
const sinon = require('sinon');
const moment = require('moment');
const Boom = require('@hapi/boom');
const { ObjectID } = require('mongodb');
const SinonMongoose = require('../sinonMongoose');
const Pay = require('../../../src/models/Pay');
const User = require('../../../src/models/User');
const Company = require('../../../src/models/Company');
const Surcharge = require('../../../src/models/Surcharge');
const DistanceMatrix = require('../../../src/models/DistanceMatrix');
const PayHelper = require('../../../src/helpers/pay');
const DraftPayHelper = require('../../../src/helpers/draftPay');
const ContractHelper = require('../../../src/helpers/contracts');
const EventRepository = require('../../../src/repositories/EventRepository');
const SectorHistoryRepository = require('../../../src/repositories/SectorHistoryRepository');
const SectorHistoryHelper = require('../../../src/helpers/sectorHistories');

require('sinon-mongoose');

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
  const companyId = new ObjectID();
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

describe('createPayList', () => {
  const credentials = { company: { _id: new ObjectID() } };
  let formatPayStub;
  let PayModel;
  beforeEach(() => {
    formatPayStub = sinon.stub(PayHelper, 'formatPay');
    PayModel = sinon.mock(Pay);
  });
  afterEach(() => {
    formatPayStub.restore();
    PayModel.restore();
  });

  it('should create pay', async () => {
    const payToCreate = [{ _id: new ObjectID() }];
    formatPayStub.returns(payToCreate[0]);
    PayModel.expects('insertMany').withExactArgs([new Pay(payToCreate[0])]);

    await PayHelper.createPayList(payToCreate, credentials);
    sinon.assert.calledWithExactly(formatPayStub, payToCreate[0], credentials.company._id);
    PayModel.verify();
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
  const credentials = { company: { _id: new ObjectID() } };
  const month = '01-2020';
  const startDate = moment(month, 'MM-YYYY').startOf('M').toDate();
  const endDate = moment(month, 'MM-YYYY').endOf('M').toDate();

  let hoursBalanceDetailBySectorStub;
  let hoursBalanceDetailByAuxiliaryStub;

  beforeEach(() => {
    hoursBalanceDetailBySectorStub = sinon.stub(PayHelper, 'hoursBalanceDetailBySector');
    hoursBalanceDetailByAuxiliaryStub = sinon.stub(PayHelper, 'hoursBalanceDetailByAuxiliary');
  });
  afterEach(() => {
    hoursBalanceDetailBySectorStub.restore();
    hoursBalanceDetailByAuxiliaryStub.restore();
  });

  it('should call hoursBalanceDetailBySector', async () => {
    const query = { sector: new ObjectID(), month };
    hoursBalanceDetailBySectorStub.returns({ data: 'ok' });

    const result = await PayHelper.hoursBalanceDetail(query, credentials);

    expect(result).toEqual({ data: 'ok' });
    sinon.assert.notCalled(hoursBalanceDetailByAuxiliaryStub);
    sinon.assert.calledWithExactly(
      hoursBalanceDetailBySectorStub,
      query.sector,
      startDate,
      endDate,
      credentials.company._id
    );
  });

  it('should call hoursBalanceDetailByAuxiliary', async () => {
    const query = { auxiliary: new ObjectID(), month };
    hoursBalanceDetailByAuxiliaryStub.returns({ data: 'ok' });

    const result = await PayHelper.hoursBalanceDetail(query, credentials);

    expect(result).toEqual({ data: 'ok' });
    sinon.assert.calledWithExactly(
      hoursBalanceDetailByAuxiliaryStub,
      query.auxiliary,
      startDate,
      endDate,
      credentials.company._id
    );
    sinon.assert.notCalled(hoursBalanceDetailBySectorStub);
  });
});

describe('hoursBalanceDetailByAuxiliary', () => {
  const auxiliaryId = new ObjectID();
  const month = moment().format('MM-YYYY');
  const startDate = moment(month, 'MM-YYYY').startOf('M').toDate();
  const endDate = moment(month, 'MM-YYYY').endOf('M').toDate();
  const query = { startDate, endDate };
  const prevMonth = moment(month, 'MM-YYYY').subtract(1, 'M').format('MM-YYYY');
  const companyId = new ObjectID();
  const credentials = { company: { _id: companyId } };
  const prevPay = { _id: new ObjectID() };
  const surcharges = [{ name: 'week-end' }];
  const distanceMatrix = {
    data: {
      rows: [{
        elements: [{ distance: { value: 363998 }, duration: { value: 13790 } }],
      }],
    },
    status: 200,
  };
  const company = { _id: companyId };
  const prevPayList = [{ hours: 10 }];

  let payFindOne;
  let userFindOne;
  let companyFindOne;
  let surchargeFind;
  let distanceMatrixFind;
  let getAuxiliarySectorsStub;
  let getEventsToPayStub;
  let getPreviousMonthPayStub;
  let getContractStub;
  let computeAuxiliaryDraftPayStub;

  beforeEach(() => {
    payFindOne = sinon.stub(Pay, 'findOne');
    userFindOne = sinon.stub(User, 'findOne');
    companyFindOne = sinon.stub(Company, 'findOne');
    surchargeFind = sinon.stub(Surcharge, 'find');
    distanceMatrixFind = sinon.stub(DistanceMatrix, 'find');
    getAuxiliarySectorsStub = sinon.stub(SectorHistoryHelper, 'getAuxiliarySectors');
    getEventsToPayStub = sinon.stub(EventRepository, 'getEventsToPay');
    getPreviousMonthPayStub = sinon.stub(DraftPayHelper, 'getPreviousMonthPay');
    getContractStub = sinon.stub(PayHelper, 'getContract');
    computeAuxiliaryDraftPayStub = sinon.stub(DraftPayHelper, 'computeAuxiliaryDraftPay');
  });

  afterEach(() => {
    payFindOne.restore();
    userFindOne.restore();
    companyFindOne.restore();
    surchargeFind.restore();
    distanceMatrixFind.restore();
    getAuxiliarySectorsStub.restore();
    getEventsToPayStub.restore();
    getPreviousMonthPayStub.restore();
    getContractStub.restore();
    computeAuxiliaryDraftPayStub.restore();
  });

  it('should return draftPay', async () => {
    const events = [{ _id: new ObjectID() }];
    const sectorId = new ObjectID();
    const auxiliaryEvent = { auxiliary: { _id: auxiliaryId }, events, absences: [] };
    const auxiliary = { _id: auxiliaryId, contracts: { startDate: '2018-11-01' } };

    getAuxiliarySectorsStub.returns([sectorId.toHexString()]);
    getEventsToPayStub.returns([auxiliaryEvent]);

    payFindOne.returns(SinonMongoose.stubChainedQueries([null, prevPay], ['lean']));
    userFindOne.returns(SinonMongoose.stubChainedQueries([auxiliary]));
    companyFindOne.returns(SinonMongoose.stubChainedQueries([company], ['lean']));
    surchargeFind.returns(SinonMongoose.stubChainedQueries([surcharges], ['lean']));
    distanceMatrixFind.returns(SinonMongoose.stubChainedQueries([distanceMatrix], ['lean']));

    const contract = { startDate: '2018-11-12' };
    getContractStub.returns(contract);
    getPreviousMonthPayStub.returns(prevPayList);
    const draft = { name: 'brouillon', sectors: [sectorId.toHexString()], counterAndDiffRelevant: true };
    computeAuxiliaryDraftPayStub.returns(draft);

    const result =
      await PayHelper.hoursBalanceDetailByAuxiliary(auxiliaryId, startDate, endDate, credentials.company._id);

    expect(result).toEqual(draft);
    sinon.assert.calledWithExactly(getAuxiliarySectorsStub, auxiliaryId, companyId, startDate, endDate);
    sinon.assert.calledWithExactly(getEventsToPayStub, startDate, endDate, [new ObjectID(auxiliaryId)], companyId);
    sinon.assert.calledWithExactly(
      getPreviousMonthPayStub,
      [{ ...auxiliary, prevPay }],
      query,
      surcharges,
      distanceMatrix,
      companyId
    );
    sinon.assert.calledWithExactly(getContractStub, auxiliary.contracts, startDate, endDate);
    sinon.assert.calledWithExactly(
      computeAuxiliaryDraftPayStub,
      auxiliary,
      contract,
      auxiliaryEvent,
      prevPayList[0],
      company,
      query,
      distanceMatrix,
      surcharges
    );
    SinonMongoose.calledWithExactly(
      payFindOne,
      [{ query: 'findOne', args: [{ auxiliary: auxiliaryId, month }] }, { query: 'lean' }]
    );
    SinonMongoose.calledWithExactly(
      payFindOne,
      [{ query: 'findOne', args: [{ auxiliary: auxiliaryId, month: prevMonth }] }, { query: 'lean' }],
      1
    );
    SinonMongoose.calledWithExactly(
      userFindOne,
      [
        { query: 'findOne', args: [{ _id: auxiliaryId }] },
        { query: 'populate', args: ['contracts'] },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledWithExactly(
      companyFindOne,
      [{ query: 'findOne', args: [{ _id: companyId }] }, { query: 'lean' }]
    );
    SinonMongoose.calledWithExactly(
      surchargeFind,
      [{ query: 'find', args: [{ company: companyId }] }, { query: 'lean' }]
    );
    SinonMongoose.calledWithExactly(
      distanceMatrixFind,
      [{ query: 'find', args: [{ company: companyId }] }, { query: 'lean' }]
    );
  });

  it('should return draftPay with counterAndDiffRelevant if contract has just started', async () => {
    const events = [{ _id: new ObjectID() }];
    const sectorId = new ObjectID();
    const auxiliaryEvent = { auxiliary: { _id: auxiliaryId }, events, absences: [] };
    const auxiliary = { _id: auxiliaryId, contracts: { startDate: '2018-11-01' } };

    getAuxiliarySectorsStub.returns([sectorId.toHexString()]);
    getEventsToPayStub.returns([auxiliaryEvent]);

    payFindOne.returns(SinonMongoose.stubChainedQueries([null, null], ['lean']));
    userFindOne.returns(SinonMongoose.stubChainedQueries([auxiliary]));
    companyFindOne.returns(SinonMongoose.stubChainedQueries([company], ['lean']));
    surchargeFind.returns(SinonMongoose.stubChainedQueries([surcharges], ['lean']));
    distanceMatrixFind.returns(SinonMongoose.stubChainedQueries([distanceMatrix], ['lean']));

    const contract = { startDate: moment().startOf('day').toDate() };
    getContractStub.returns(contract);
    getPreviousMonthPayStub.returns(prevPayList);
    const draft = { name: 'brouillon', sectors: [sectorId.toHexString()], counterAndDiffRelevant: true };
    computeAuxiliaryDraftPayStub.returns(draft);

    const result =
      await PayHelper.hoursBalanceDetailByAuxiliary(auxiliaryId, startDate, endDate, credentials.company._id);

    expect(result).toEqual(draft);
  });

  it('should return draftPay with counterAndDiffRelevant to false if no prevPay and not firstmonth', async () => {
    const events = [{ _id: new ObjectID() }];
    const sectorId = new ObjectID();
    const auxiliaryEvent = { auxiliary: { _id: auxiliaryId }, events, absences: [] };
    const auxiliary = { _id: auxiliaryId, contracts: { startDate: '2018-11-01' } };

    getAuxiliarySectorsStub.returns([sectorId.toHexString()]);
    getEventsToPayStub.returns([auxiliaryEvent]);

    payFindOne.returns(SinonMongoose.stubChainedQueries([null, null], ['lean']));
    userFindOne.returns(SinonMongoose.stubChainedQueries([auxiliary]));
    companyFindOne.returns(SinonMongoose.stubChainedQueries([company], ['lean']));
    surchargeFind.returns(SinonMongoose.stubChainedQueries([surcharges], ['lean']));
    distanceMatrixFind.returns(SinonMongoose.stubChainedQueries([distanceMatrix], ['lean']));

    const contract = { startDate: '2018-12-01' };
    getContractStub.returns(contract);
    getPreviousMonthPayStub.returns(prevPayList);
    const draft = { name: 'brouillon', sectors: [sectorId.toHexString()], counterAndDiffRelevant: false };
    computeAuxiliaryDraftPayStub.returns(draft);

    const result =
      await PayHelper.hoursBalanceDetailByAuxiliary(auxiliaryId, startDate, endDate, credentials.company._id);

    expect(result).toEqual(draft);
  });

  it('should return pay if it exists', async () => {
    const pay = { _id: new ObjectID() };
    const sectorId = new ObjectID();

    getAuxiliarySectorsStub.returns([sectorId.toHexString()]);
    payFindOne.returns(SinonMongoose.stubChainedQueries([pay], ['lean']));

    const result =
      await PayHelper.hoursBalanceDetailByAuxiliary(auxiliaryId, startDate, endDate, credentials.company._id);

    expect(result).toEqual({ ...pay, sectors: [sectorId.toHexString()], counterAndDiffRelevant: true });
    sinon.assert.notCalled(getEventsToPayStub);
    sinon.assert.notCalled(getPreviousMonthPayStub);
    sinon.assert.notCalled(getContractStub);
    sinon.assert.notCalled(computeAuxiliaryDraftPayStub);
    SinonMongoose.calledWithExactly(
      payFindOne,
      [{ query: 'findOne', args: [{ auxiliary: auxiliaryId, month }] }, { query: 'lean' }]
    );
    sinon.assert.notCalled(userFindOne);
    sinon.assert.notCalled(companyFindOne);
    sinon.assert.notCalled(surchargeFind);
    sinon.assert.notCalled(distanceMatrixFind);
  });

  it('should return 400 if no contract', async () => {
    const events = [{ _id: new ObjectID() }];
    const sectorId = new ObjectID();
    const auxiliary = { _id: auxiliaryId, contracts: { startDate: '2018-11-01' } };
    try {
      getAuxiliarySectorsStub.returns([sectorId.toHexString()]);
      getEventsToPayStub.returns([]);
      getPreviousMonthPayStub.returns(prevPayList);
      getEventsToPayStub.returns([{ auxiliary: { _id: auxiliaryId }, events, absences: [] }]);

      payFindOne.returns(SinonMongoose.stubChainedQueries([null, prevPay], ['lean']));
      userFindOne.returns(SinonMongoose.stubChainedQueries([auxiliary]));
      companyFindOne.returns(SinonMongoose.stubChainedQueries([company], ['lean']));
      surchargeFind.returns(SinonMongoose.stubChainedQueries([surcharges], ['lean']));
      distanceMatrixFind.returns(SinonMongoose.stubChainedQueries([distanceMatrix], ['lean']));

      getContractStub.returns();

      await PayHelper.hoursBalanceDetailByAuxiliary(auxiliaryId, startDate, endDate, credentials.company._id);
    } catch (e) {
      expect(e).toEqual(Boom.badRequest());
    } finally {
      sinon.assert.notCalled(computeAuxiliaryDraftPayStub);
    }
  });

  it('should return null if no draftPay', async () => {
    const events = [{ _id: new ObjectID() }];
    const sectorId = new ObjectID();
    const auxiliaryEvent = { auxiliary: { _id: auxiliaryId }, events, absences: [] };
    const auxiliary = { _id: auxiliaryId, contracts: { startDate: '2018-11-01' } };

    getAuxiliarySectorsStub.returns([sectorId.toHexString()]);
    getEventsToPayStub.returns([auxiliaryEvent]);
    payFindOne.returns(SinonMongoose.stubChainedQueries([null, prevPay], ['lean']));
    userFindOne.returns(SinonMongoose.stubChainedQueries([auxiliary]));
    companyFindOne.returns(SinonMongoose.stubChainedQueries([company], ['lean']));
    surchargeFind.returns(SinonMongoose.stubChainedQueries([surcharges], ['lean']));
    distanceMatrixFind.returns(SinonMongoose.stubChainedQueries([distanceMatrix], ['lean']));

    computeAuxiliaryDraftPayStub.returns();
    const contract = { startDate: '2018-11-12' };
    getContractStub.returns(contract);
    getPreviousMonthPayStub.returns(prevPayList);

    const result =
      await PayHelper.hoursBalanceDetailByAuxiliary(auxiliaryId, startDate, endDate, credentials.company._id);

    expect(result).toBe(null);
  });
});

describe('hoursBalanceDetailBySector', () => {
  const credentials = { company: { _id: new ObjectID() } };
  const month = '01-2020';
  const startDate = moment(month, 'MM-YYYY').startOf('M').toDate();
  const endDate = moment(month, 'MM-YYYY').endOf('M').toDate();

  let getUsersFromSectorHistoriesStub;
  let getContractStub;
  let hoursBalanceDetailByAuxiliaryStub;
  let UserMock;
  beforeEach(() => {
    getUsersFromSectorHistoriesStub = sinon.stub(SectorHistoryRepository, 'getUsersFromSectorHistories');
    getContractStub = sinon.stub(PayHelper, 'getContract');
    hoursBalanceDetailByAuxiliaryStub = sinon.stub(PayHelper, 'hoursBalanceDetailByAuxiliary');
    UserMock = sinon.mock(User);
  });
  afterEach(() => {
    getUsersFromSectorHistoriesStub.restore();
    getContractStub.restore();
    hoursBalanceDetailByAuxiliaryStub.restore();
    UserMock.verify();
  });

  it('should return an empty array if no information', async () => {
    const query = { sector: new ObjectID() };
    getUsersFromSectorHistoriesStub.returns([]);

    UserMock
      .expects('find')
      .withExactArgs({ company: credentials.company._id, _id: { $in: [] } })
      .chain('populate')
      .withExactArgs('contracts')
      .chain('lean')
      .returns([]);

    const result = await PayHelper.hoursBalanceDetailBySector(
      query.sector,
      startDate,
      endDate,
      credentials.company._id
    );

    expect(result).toEqual([]);
    sinon.assert.calledWithExactly(
      getUsersFromSectorHistoriesStub,
      startDate,
      endDate,
      [query.sector],
      credentials.company._id
    );
  });

  it('should return the info for a sector', async () => {
    const query = { sector: new ObjectID() };
    const auxiliaryId = new ObjectID();
    const usersFromSectorHistories = [{ auxiliaryId }];
    getUsersFromSectorHistoriesStub.returns(usersFromSectorHistories);
    const contract = { _id: 'poiuytre' };
    UserMock
      .expects('find')
      .withExactArgs({ company: credentials.company._id, _id: { $in: [auxiliaryId] } })
      .chain('populate')
      .withExactArgs('contracts')
      .chain('lean')
      .returns([{ _id: auxiliaryId, contracts: [contract], identity: 'test', picture: 'toto' }]);

    getContractStub.returns(contract);

    hoursBalanceDetailByAuxiliaryStub.returns({ auxiliary: auxiliaryId, hours: 10 });

    const result = await PayHelper.hoursBalanceDetailBySector(
      query.sector,
      startDate,
      endDate,
      credentials.company._id
    );

    expect(result).toEqual([{ auxiliaryId, auxiliary: auxiliaryId, hours: 10, identity: 'test', picture: 'toto' }]);
    sinon.assert.calledWithExactly(
      getUsersFromSectorHistoriesStub,
      startDate,
      endDate,
      [query.sector],
      credentials.company._id
    );
    sinon.assert.calledWithExactly(getContractStub, [contract], startDate, endDate);
    sinon.assert.calledWithExactly(
      hoursBalanceDetailByAuxiliaryStub,
      auxiliaryId,
      startDate,
      endDate,
      credentials.company._id
    );
  });

  it('should return the info for many sectors', async () => {
    const query = { sector: [new ObjectID(), new ObjectID()] };
    const auxiliaryIds = [new ObjectID(), new ObjectID()];
    const usersFromSectorHistories = [{ auxiliaryId: auxiliaryIds[0] }, { auxiliaryId: auxiliaryIds[1] }];
    getUsersFromSectorHistoriesStub.returns(usersFromSectorHistories);
    const contracts = [{ _id: auxiliaryIds[0] }, { _id: auxiliaryIds[1] }];
    UserMock
      .expects('find')
      .withExactArgs({ company: credentials.company._id, _id: { $in: auxiliaryIds } })
      .chain('populate')
      .withExactArgs('contracts')
      .chain('lean')
      .returns([
        { _id: auxiliaryIds[0], contracts: [contracts[0]], identity: 'test', picture: 'toto' },
        { _id: auxiliaryIds[1], contracts: [contracts[1]], identity: 'test2', picture: 'toto2' },
      ]);

    getContractStub.onCall(0).returns(contracts[0]);
    getContractStub.onCall(1).returns(contracts[1]);

    hoursBalanceDetailByAuxiliaryStub.onCall(0).returns({ auxiliary: auxiliaryIds[0], hours: 10 });
    hoursBalanceDetailByAuxiliaryStub.onCall(1).returns({ auxiliary: auxiliaryIds[1], hours: 16 });

    const result = await PayHelper.hoursBalanceDetailBySector(
      query.sector,
      startDate,
      endDate,
      credentials.company._id
    );

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
      hoursBalanceDetailByAuxiliaryStub.getCall(0),
      auxiliaryIds[0],
      startDate,
      endDate,
      credentials.company._id
    );
    sinon.assert.calledWithExactly(
      hoursBalanceDetailByAuxiliaryStub.getCall(1),
      auxiliaryIds[1],
      startDate,
      endDate,
      credentials.company._id
    );
  });

  it('should not take into account if auxiliary does not have contract', async () => {
    const query = { sector: new ObjectID() };
    const auxiliaryId = new ObjectID();
    const usersFromSectorHistories = [{ auxiliaryId }];
    getUsersFromSectorHistoriesStub.returns(usersFromSectorHistories);
    UserMock
      .expects('find')
      .withExactArgs({ company: credentials.company._id, _id: { $in: [auxiliaryId] } })
      .chain('populate')
      .withExactArgs('contracts')
      .chain('lean')
      .returns([{ _id: auxiliaryId, name: 'titi' }]);

    const result = await PayHelper.hoursBalanceDetailBySector(
      query.sector,
      startDate,
      endDate,
      credentials.company._id
    );

    expect(result).toEqual([]);
    sinon.assert.calledWithExactly(
      getUsersFromSectorHistoriesStub,
      startDate,
      endDate,
      [query.sector],
      credentials.company._id
    );
    sinon.assert.notCalled(getContractStub);
    sinon.assert.notCalled(hoursBalanceDetailByAuxiliaryStub);
  });

  it('should not take into account if auxiliary does not currently have contract', async () => {
    const query = { sector: new ObjectID() };
    const auxiliaryId = new ObjectID();
    const usersFromSectorHistories = [{ auxiliaryId }];
    getUsersFromSectorHistoriesStub.returns(usersFromSectorHistories);
    const contract = { _id: 'poiuytr' };
    UserMock
      .expects('find')
      .withExactArgs({ company: credentials.company._id, _id: { $in: [auxiliaryId] } })
      .chain('populate')
      .withExactArgs('contracts')
      .chain('lean')
      .returns([{ contracts: [contract] }]);

    getContractStub.returns();

    const result = await PayHelper.hoursBalanceDetailBySector(
      query.sector,
      startDate,
      endDate,
      credentials.company._id
    );

    expect(result).toEqual([]);
    sinon.assert.calledWithExactly(
      getUsersFromSectorHistoriesStub,
      startDate,
      endDate,
      [query.sector],
      credentials.company._id
    );
    sinon.assert.calledWithExactly(getContractStub, [contract], startDate, endDate);
    sinon.assert.notCalled(hoursBalanceDetailByAuxiliaryStub);
  });
});

describe('computeHoursToWork', () => {
  const contractQuery = {
    startDate: moment('122019', 'MMYYYY').startOf('M').toDate(),
    endDate: moment('122019', 'MMYYYY').endOf('M').toDate(),
  };
  const sector = { startDate: moment('2017-11-01').toDate() };
  let getContractMonthInfoStub;
  let getPayFromAbsences;
  let getMatchingVersionsListStub;
  beforeEach(() => {
    getContractMonthInfoStub = sinon.stub(DraftPayHelper, 'getContractMonthInfo');
    getPayFromAbsences = sinon.stub(DraftPayHelper, 'getPayFromAbsences');
    getMatchingVersionsListStub = sinon.stub(ContractHelper, 'getMatchingVersionsList');
  });
  afterEach(() => {
    getContractMonthInfoStub.restore();
    getPayFromAbsences.restore();
    getMatchingVersionsListStub.restore();
  });

  it('should compute hours to work with absences', () => {
    const contracts = [
      {
        _id: new ObjectID(),
        absences: [{ _id: new ObjectID() }],
        sector,
        versions: [{ startDate: moment('2018-11-01').toDate() }],
      },
    ];
    getMatchingVersionsListStub.returns(contracts[0].versions);
    getContractMonthInfoStub.returns({ contractHours: 85, holidaysHours: 5 });
    getPayFromAbsences.returns(6);

    const result = PayHelper.computeHoursToWork('122019', contracts);
    expect(result).toBe(74);
    sinon.assert.calledWithExactly(getContractMonthInfoStub, contracts[0], contractQuery);
    sinon.assert.calledWithExactly(getPayFromAbsences, contracts[0].absences, contracts[0], contractQuery);
    sinon.assert.calledWithExactly(getMatchingVersionsListStub, contracts[0].versions, contractQuery);
  });

  it('should compute hours to work without absences', () => {
    const contracts = [
      { _id: new ObjectID(), absences: [], sector, versions: [{ startDate: moment('2018-11-01').toDate() }] },
      { _id: new ObjectID(), absences: [], sector, versions: [{ startDate: moment('2018-11-01').toDate() }] },
    ];
    getContractMonthInfoStub.onCall(0).returns({ contractHours: 85, holidaysHours: 5 });
    getContractMonthInfoStub.onCall(1).returns({ contractHours: 100, holidaysHours: 5 });
    getMatchingVersionsListStub.onCall(0).returns(contracts[0].versions);
    getMatchingVersionsListStub.onCall(1).returns(contracts[1].versions);

    const result = PayHelper.computeHoursToWork('122019', contracts);
    expect(result).toBe(175);
    sinon.assert.calledWithExactly(getContractMonthInfoStub.getCall(0), contracts[0], contractQuery);
    sinon.assert.calledWithExactly(getContractMonthInfoStub.getCall(1), contracts[1], contractQuery);
    sinon.assert.calledWithExactly(getMatchingVersionsListStub, contracts[0].versions, contractQuery);
    sinon.assert.notCalled(getPayFromAbsences);
  });

  it('should change version endDate if auxiliary changed sector', () => {
    const endDate = moment('2019-12-10').endOf('d').toDate();
    const contractId = new ObjectID();
    const contracts = [
      {
        _id: contractId,
        absences: [],
        sector: { ...sector, endDate },
        versions: [{ startDate: moment('2018-11-01').startOf('day').toDate() }],
      },
    ];
    const newContract = {
      _id: contractId,
      absences: [],
      sector: { ...sector, endDate },
      versions: [{ startDate: moment('2018-11-01').startOf('day').toDate(), endDate }],
    };
    getContractMonthInfoStub.returns({ contractHours: 85, holidaysHours: 5 });
    getMatchingVersionsListStub.returns(contracts[0].versions);

    const result = PayHelper.computeHoursToWork('122019', contracts);
    expect(result).toBe(80);
    sinon.assert.calledWithExactly(getContractMonthInfoStub, newContract, { ...contractQuery, endDate });
    sinon.assert.calledWithExactly(getMatchingVersionsListStub, contracts[0].versions, { ...contractQuery, endDate });
    sinon.assert.notCalled(getPayFromAbsences);
  });

  it('should change version startDate if auxiliary changed sector', () => {
    const startDate = moment('2019-12-10').toDate();
    const contractId = new ObjectID();
    const contracts = [
      {
        _id: contractId,
        absences: [],
        sector: { ...sector, startDate },
        versions: [{ startDate: moment('2018-11-01').toDate() }],
      },
    ];
    const newContract = {
      _id: contractId,
      absences: [],
      sector: { ...sector, startDate },
      versions: [{ startDate }],
    };
    getContractMonthInfoStub.returns({ contractHours: 85, holidaysHours: 5 });
    getMatchingVersionsListStub.returns(contracts[0].versions);

    const result = PayHelper.computeHoursToWork('122019', contracts);
    expect(result).toBe(80);
    sinon.assert.calledWithExactly(getContractMonthInfoStub, newContract, { ...contractQuery, startDate });
    sinon.assert.calledWithExactly(getMatchingVersionsListStub, contracts[0].versions, { ...contractQuery, startDate });
    sinon.assert.notCalled(getPayFromAbsences);
  });
});

describe('getHoursToWorkBySector', () => {
  const credentials = { company: { _id: new ObjectID() } };
  let getContractsAndAbsencesBySectorStub;
  let computeHoursToWorkStub;

  beforeEach(() => {
    getContractsAndAbsencesBySectorStub = sinon.stub(SectorHistoryRepository, 'getContractsAndAbsencesBySector');
    computeHoursToWorkStub = sinon.stub(PayHelper, 'computeHoursToWork');
  });

  afterEach(() => {
    getContractsAndAbsencesBySectorStub.restore();
    computeHoursToWorkStub.restore();
  });

  it('should return hours to work by sector (sectors as array + absences)', async () => {
    const query = { sector: [new ObjectID(), new ObjectID()], month: '122019' };
    const contractAndAbsences = [
      {
        _id: query.sector[0],
        contracts: [{ _id: new ObjectID(), absences: [] }, { _id: new ObjectID(), absences: [] }],
      },
      { _id: query.sector[1], contracts: [{ _id: new ObjectID(), absences: [{ _id: new ObjectID() }] }] },
    ];
    getContractsAndAbsencesBySectorStub.returns(contractAndAbsences);
    computeHoursToWorkStub.onCall(0).returns(240);
    computeHoursToWorkStub.onCall(1).returns(74);

    const result = await PayHelper.getHoursToWorkBySector(query, credentials);

    expect(result).toEqual(expect.arrayContaining([
      { sector: query.sector[0], hoursToWork: 240 },
      { sector: query.sector[1], hoursToWork: 74 },
    ]));
    sinon.assert.calledWithExactly(
      getContractsAndAbsencesBySectorStub,
      query.month,
      query.sector.map(sector => new ObjectID(sector)),
      credentials.company._id
    );
    sinon.assert.calledWithExactly(computeHoursToWorkStub.getCall(0), query.month, contractAndAbsences[0].contracts);
    sinon.assert.calledWithExactly(computeHoursToWorkStub.getCall(1), query.month, contractAndAbsences[1].contracts);
  });

  it('should return hours to work by sector (sectors as string + no absences)', async () => {
    const query = { sector: new ObjectID(), month: '122019' };
    const contractAndAbsences = [
      {
        _id: query.sector,
        contracts: [{ _id: new ObjectID(), absences: [] }, { _id: new ObjectID(), absences: [] }],
      },
    ];
    getContractsAndAbsencesBySectorStub.returns(contractAndAbsences);
    computeHoursToWorkStub.returns(240);

    const result = await PayHelper.getHoursToWorkBySector(query, credentials);

    expect(result).toEqual(expect.arrayContaining([
      { sector: query.sector, hoursToWork: 240 },
    ]));
    sinon.assert.calledWithExactly(
      getContractsAndAbsencesBySectorStub,
      query.month,
      [new ObjectID(query.sector)],
      credentials.company._id
    );
    sinon.assert.calledWithExactly(computeHoursToWorkStub, query.month, contractAndAbsences[0].contracts);
  });
});
