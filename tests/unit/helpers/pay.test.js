const expect = require('expect');
const sinon = require('sinon');
const moment = require('moment');
const Boom = require('@hapi/boom');
const { ObjectID } = require('mongodb');
const SinonMongoose = require('../sinonMongoose');
const Pay = require('../../../src/models/Pay');
const User = require('../../../src/models/User');
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
    const query = { sector: new ObjectID(), month };
    hoursBalanceDetailBySectorStub.returns({ data: 'ok' });

    const result = await PayHelper.hoursBalanceDetail(query, credentials);

    expect(result).toEqual({ data: 'ok' });
    sinon.assert.notCalled(hoursBalanceDetailByAuxiliary);
    sinon.assert.calledWithExactly(hoursBalanceDetailBySectorStub, query.sector, startDate, endDate, credentials);
  });

  it('should call hoursBalanceDetailByAuxiliary', async () => {
    const query = { auxiliary: new ObjectID(), month };
    hoursBalanceDetailByAuxiliary.returns({ data: 'ok' });

    const result = await PayHelper.hoursBalanceDetail(query, credentials);

    expect(result).toEqual({ data: 'ok' });
    sinon.assert.calledWithExactly(hoursBalanceDetailByAuxiliary, query.auxiliary, startDate, endDate, credentials);
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

  let payFindOne;
  let userFindOne;
  let getAuxiliarySectors;
  let getContractStub;
  let computeDraftPayByAuxiliary;

  beforeEach(() => {
    payFindOne = sinon.stub(Pay, 'findOne');
    userFindOne = sinon.stub(User, 'findOne');
    getAuxiliarySectors = sinon.stub(SectorHistoryHelper, 'getAuxiliarySectors');
    getContractStub = sinon.stub(PayHelper, 'getContract');
    computeDraftPayByAuxiliary = sinon.stub(DraftPayHelper, 'computeDraftPayByAuxiliary');
  });

  afterEach(() => {
    payFindOne.restore();
    userFindOne.restore();
    getAuxiliarySectors.restore();
    getContractStub.restore();
    computeDraftPayByAuxiliary.restore();
  });

  it('should return draftPay', async () => {
    const sectorId = new ObjectID();
    const auxiliary = { _id: auxiliaryId, contracts: { startDate: '2018-11-01' } };
    const contract = { startDate: '2018-11-12' };
    const draft = { name: 'brouillon' };

    getAuxiliarySectors.returns([sectorId.toHexString()]);
    payFindOne.returns(SinonMongoose.stubChainedQueries([null, prevPay], ['lean']));
    userFindOne.returns(SinonMongoose.stubChainedQueries([auxiliary]));
    getContractStub.returns(contract);
    computeDraftPayByAuxiliary.returns([draft]);

    const result = await PayHelper.hoursBalanceDetailByAuxiliary(auxiliaryId, startDate, endDate, credentials);

    expect(result).toEqual({ ...draft, sectors: [sectorId.toHexString()], counterAndDiffRelevant: true });
    sinon.assert.calledWithExactly(getAuxiliarySectors, auxiliaryId, companyId, startDate, endDate);
    sinon.assert.calledWithExactly(getContractStub, auxiliary.contracts, startDate, endDate);
    sinon.assert.calledWithExactly(computeDraftPayByAuxiliary, [{ ...auxiliary, prevPay }], query, credentials);
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
  });

  it('should return draftPay with counterAndDiffRelevant if contract has just started', async () => {
    const sectorId = new ObjectID();
    const auxiliary = { _id: auxiliaryId, contracts: { startDate: '2018-11-01' } };
    const contract = { startDate: moment().startOf('day').toDate() };
    const draft = { name: 'brouillon' };

    getAuxiliarySectors.returns([sectorId.toHexString()]);
    payFindOne.returns(SinonMongoose.stubChainedQueries([null, null], ['lean']));
    userFindOne.returns(SinonMongoose.stubChainedQueries([auxiliary]));
    getContractStub.returns(contract);
    computeDraftPayByAuxiliary.returns([draft]);

    const result = await PayHelper.hoursBalanceDetailByAuxiliary(auxiliaryId, startDate, endDate, credentials);

    expect(result).toEqual({ ...draft, sectors: [sectorId.toHexString()], counterAndDiffRelevant: true });
  });

  it('should return draftPay with counterAndDiffRelevant to false if no prevPay and not firstmonth', async () => {
    const sectorId = new ObjectID();
    const auxiliary = { _id: auxiliaryId, contracts: { startDate: '2018-11-01' } };
    const contract = { startDate: '2018-12-01' };
    const draft = { name: 'brouillon' };

    getAuxiliarySectors.returns([sectorId.toHexString()]);
    payFindOne.returns(SinonMongoose.stubChainedQueries([null, null], ['lean']));
    userFindOne.returns(SinonMongoose.stubChainedQueries([auxiliary]));
    getContractStub.returns(contract);
    computeDraftPayByAuxiliary.returns([draft]);

    const result = await PayHelper.hoursBalanceDetailByAuxiliary(auxiliaryId, startDate, endDate, credentials);

    expect(result).toEqual({ ...draft, sectors: [sectorId.toHexString()], counterAndDiffRelevant: false });
  });

  it('should return pay if it exists', async () => {
    const pay = { _id: new ObjectID() };
    const sectorId = new ObjectID();

    getAuxiliarySectors.returns([sectorId.toHexString()]);
    payFindOne.returns(SinonMongoose.stubChainedQueries([pay], ['lean']));

    const result = await PayHelper.hoursBalanceDetailByAuxiliary(auxiliaryId, startDate, endDate, credentials);

    expect(result).toEqual({ ...pay, sectors: [sectorId.toHexString()], counterAndDiffRelevant: true });
    sinon.assert.notCalled(getContractStub);
    sinon.assert.notCalled(computeDraftPayByAuxiliary);
    SinonMongoose.calledWithExactly(
      payFindOne,
      [{ query: 'findOne', args: [{ auxiliary: auxiliaryId, month }] }, { query: 'lean' }]
    );
    sinon.assert.notCalled(userFindOne);
  });

  it('should return 400 if no contract', async () => {
    const sectorId = new ObjectID();
    const auxiliary = { _id: auxiliaryId, contracts: { startDate: '2018-11-01' } };
    try {
      getAuxiliarySectors.returns([sectorId.toHexString()]);

      payFindOne.returns(SinonMongoose.stubChainedQueries([null, prevPay], ['lean']));
      userFindOne.returns(SinonMongoose.stubChainedQueries([auxiliary]));

      getContractStub.returns();

      await PayHelper.hoursBalanceDetailByAuxiliary(auxiliaryId, startDate, endDate, credentials);
    } catch (e) {
      expect(e).toEqual(Boom.badRequest());
    } finally {
      sinon.assert.notCalled(computeDraftPayByAuxiliary);
    }
  });

  it('should return null if no draftPay', async () => {
    const sectorId = new ObjectID();
    const auxiliary = { _id: auxiliaryId, contracts: { startDate: '2018-11-01' } };
    const contract = { startDate: '2018-11-12' };

    getAuxiliarySectors.returns([sectorId.toHexString()]);
    payFindOne.returns(SinonMongoose.stubChainedQueries([null, prevPay], ['lean']));
    userFindOne.returns(SinonMongoose.stubChainedQueries([auxiliary]));
    computeDraftPayByAuxiliary.returns([]);
    getContractStub.returns(contract);

    const result = await PayHelper.hoursBalanceDetailByAuxiliary(auxiliaryId, startDate, endDate, credentials);

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
  let hoursBalanceDetailByAuxiliary;
  let UserMock;
  beforeEach(() => {
    getUsersFromSectorHistoriesStub = sinon.stub(SectorHistoryRepository, 'getUsersFromSectorHistories');
    getContractStub = sinon.stub(PayHelper, 'getContract');
    hoursBalanceDetailByAuxiliary = sinon.stub(PayHelper, 'hoursBalanceDetailByAuxiliary');
    UserMock = sinon.mock(User);
  });
  afterEach(() => {
    getUsersFromSectorHistoriesStub.restore();
    getContractStub.restore();
    hoursBalanceDetailByAuxiliary.restore();
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

    const result = await PayHelper.hoursBalanceDetailBySector(query.sector, startDate, endDate, credentials);

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
    const contract = { _id: 'poiuytre' };

    UserMock.expects('find')
      .withExactArgs({ company: credentials.company._id, _id: { $in: [auxiliaryId] } })
      .chain('populate')
      .withExactArgs('contracts')
      .chain('lean')
      .returns([{ _id: auxiliaryId, contracts: [contract], identity: 'test', picture: 'toto' }]);
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
    sinon.assert.calledWithExactly( hoursBalanceDetailByAuxiliary, auxiliaryId, startDate, endDate, credentials s);
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
