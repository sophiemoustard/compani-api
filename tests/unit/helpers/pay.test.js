const expect = require('expect');
const sinon = require('sinon');
const moment = require('moment');
const Boom = require('boom');
const { ObjectID } = require('mongodb');
const Pay = require('../../../src/models/Pay');
const User = require('../../../src/models/User');
const Company = require('../../../src/models/Company');
const Surcharge = require('../../../src/models/Surcharge');
const DistanceMatrix = require('../../../src/models/DistanceMatrix');
const PayHelper = require('../../../src/helpers/pay');
const DraftPayHelper = require('../../../src/helpers/draftPay');
const EventRepository = require('../../../src/repositories/EventRepository');
const UserRepository = require('../../../src/repositories/UserRepository');
const { COMPANY_CONTRACT, CUSTOMER_CONTRACT } = require('../../../src/helpers/constants');

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
    const contracts = [{ status: COMPANY_CONTRACT, startDate: '2019-10-10' }];
    const result = PayHelper.getContract(contracts, startDate, endDate);
    expect(result).toBeDefined();
    expect(result).toEqual({ status: COMPANY_CONTRACT, startDate: '2019-10-10' });
  });

  it('should return a contract if it has a endDate which is after our query startDate', async () => {
    const contracts = [{ status: COMPANY_CONTRACT, startDate: '2019-10-10', endDate: '2019-12-15' }];
    const result = PayHelper.getContract(contracts, startDate, endDate);
    expect(result).toBeDefined();
    expect(result).toEqual({ status: COMPANY_CONTRACT, startDate: '2019-10-10', endDate: '2019-12-15' });
  });

  it('should return no contract if not a company contract', async () => {
    const contracts = [{ status: CUSTOMER_CONTRACT, startDate: '2019-10-10' }];
    const result = PayHelper.getContract(contracts, startDate, endDate);
    expect(result).toBeUndefined();
  });

  it('should return no contract if the contract has not yet started', async () => {
    const contracts = [{ status: COMPANY_CONTRACT, startDate: '2020-01-10' }];
    const result = PayHelper.getContract(contracts, startDate, endDate);
    expect(result).toBeUndefined();
  });

  it('should return no contract if the contract has a endDate which is before our query start date', async () => {
    const contracts = [{ status: COMPANY_CONTRACT, startDate: '2019-10-10', endDate: '2019-10-12' }];
    const result = PayHelper.getContract(contracts, startDate, endDate);
    expect(result).toBeUndefined();
  });
});

describe('hoursBalanceDetail', () => {
  const auxiliaryId = new ObjectID();
  const month = moment();
  const startDate = moment(month, 'MM-YYYY').startOf('M').toDate();
  const endDate = moment(month, 'MM-YYYY').endOf('M').toDate();
  const query = { startDate, endDate };
  const prevMonth = moment(month, 'MM-YYYY').subtract(1, 'M').format('MM-YYYY');
  const companyId = new ObjectID();
  const credentials = { company: { _id: companyId } };
  const customersCount = 2;
  const prevPay = { _id: new ObjectID() };
  const surcharges = [{ name: 'week-end' }];
  const distanceMatrix = {
    data: {
      rows: [{
        elements: [{
          distance: { value: 363998 },
          duration: { value: 13790 },
        }],
      }],
    },
    status: 200,
  };
  const company = { _id: companyId };
  const prevPayList = [{ hours: 10 }];

  let PayModel;
  let UserModel;
  let CompanyModel;
  let SurchargeModel;
  let DistanceMatrixModel;
  let getEventsToPayStub;
  let getCustomerCountStub;
  let getPreviousMonthPayStub;
  let getContractStub;
  let computeAuxiliaryDraftPayStub;

  beforeEach(() => {
    PayModel = sinon.mock(Pay);
    UserModel = sinon.mock(User);
    CompanyModel = sinon.mock(Company);
    SurchargeModel = sinon.mock(Surcharge);
    DistanceMatrixModel = sinon.mock(DistanceMatrix);
    getEventsToPayStub = sinon.stub(EventRepository, 'getEventsToPay');
    getCustomerCountStub = sinon.stub(PayHelper, 'getCustomerCount');
    getPreviousMonthPayStub = sinon.stub(DraftPayHelper, 'getPreviousMonthPay');
    getContractStub = sinon.stub(PayHelper, 'getContract');
    computeAuxiliaryDraftPayStub = sinon.stub(DraftPayHelper, 'computeAuxiliaryDraftPay');
  });

  afterEach(() => {
    PayModel.restore();
    UserModel.restore();
    CompanyModel.restore();
    SurchargeModel.restore();
    DistanceMatrixModel.restore();
    getEventsToPayStub.restore();
    getCustomerCountStub.restore();
    getPreviousMonthPayStub.restore();
    getContractStub.restore();
    computeAuxiliaryDraftPayStub.restore();
  });

  it('should return draftPay', async () => {
    PayModel
      .expects('findOne')
      .withExactArgs({ auxiliary: auxiliaryId, month })
      .chain('lean')
      .returns();

    const events = [{ _id: new ObjectID() }];
    const auxiliaryEvent = { auxiliary: { _id: auxiliaryId }, events, absences: [] };
    getEventsToPayStub.returns([auxiliaryEvent]);
    getCustomerCountStub.returns(customersCount);

    const auxiliary = { _id: auxiliaryId, contracts: { startDate: '2018-11-01' } };
    UserModel
      .expects('findOne')
      .withExactArgs({ _id: auxiliaryId })
      .chain('populate')
      .chain('lean')
      .returns(auxiliary);
    PayModel
      .expects('findOne')
      .withExactArgs({ auxiliary: auxiliaryId, month: prevMonth })
      .chain('lean')
      .returns(prevPay);
    CompanyModel
      .expects('findOne')
      .withExactArgs({ _id: companyId })
      .chain('lean')
      .returns(company);
    SurchargeModel
      .expects('find')
      .withExactArgs({ company: companyId })
      .chain('lean')
      .returns(surcharges);
    DistanceMatrixModel
      .expects('find')
      .withExactArgs({ company: companyId })
      .chain('lean')
      .returns(distanceMatrix);

    const contract = { startDate: '2018-11-12' };
    getContractStub.returns(contract);
    getPreviousMonthPayStub.returns(prevPayList);
    const draft = { name: 'brouillon' };
    computeAuxiliaryDraftPayStub.returns(draft);

    const result = await PayHelper.hoursBalanceDetail(auxiliaryId, month, credentials);

    expect(result).toEqual({ ...draft, customersCount });
    sinon.assert.calledWithExactly(getEventsToPayStub, startDate, endDate, [new ObjectID(auxiliaryId)], companyId);
    sinon.assert.calledWithExactly(getCustomerCountStub, events);
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
  });

  it('should return pay if it exists', async () => {
    const pay = { _id: new ObjectID() };
    PayModel
      .expects('findOne')
      .withExactArgs({ auxiliary: auxiliaryId, month })
      .chain('lean')
      .returns(pay);

    const events = [{ _id: new ObjectID() }];
    getEventsToPayStub.returns([{ auxiliary: { _id: auxiliaryId }, events, absences: [] }]);
    getCustomerCountStub.returns(customersCount);

    const result = await PayHelper.hoursBalanceDetail(auxiliaryId, month, credentials);

    expect(result).toEqual({ ...pay, customersCount });
    sinon.assert.calledWithExactly(getEventsToPayStub, startDate, endDate, [new ObjectID(auxiliaryId)], companyId);
    sinon.assert.calledWithExactly(getCustomerCountStub, events);
    sinon.assert.notCalled(getPreviousMonthPayStub);
    sinon.assert.notCalled(getContractStub);
    sinon.assert.notCalled(computeAuxiliaryDraftPayStub);
  });

  it('should not call getCustomerCount if no event', async () => {
    const pay = { _id: new ObjectID() };
    PayModel
      .expects('findOne')
      .withExactArgs({ auxiliary: auxiliaryId, month })
      .chain('lean')
      .returns(pay);
    getEventsToPayStub.returns([]);
    await PayHelper.hoursBalanceDetail(auxiliaryId, month, credentials);
    sinon.assert.notCalled(getCustomerCountStub);
  });

  it('should return 400 if no contract', async () => {
    const events = [{ _id: new ObjectID() }];
    const auxiliary = { _id: auxiliaryId, contracts: { startDate: '2018-11-01' } };
    try {
      PayModel
        .expects('findOne')
        .withExactArgs({ auxiliary: auxiliaryId, month })
        .chain('lean')
        .returns();

      getEventsToPayStub.returns([]);
      getPreviousMonthPayStub.returns(prevPayList);
      getEventsToPayStub.returns([{ auxiliary: { _id: auxiliaryId }, events, absences: [] }]);
      getCustomerCountStub.returns(customersCount);

      UserModel
        .expects('findOne')
        .withExactArgs({ _id: auxiliaryId })
        .chain('populate')
        .chain('lean')
        .returns(auxiliary);
      PayModel
        .expects('findOne')
        .withExactArgs({ auxiliary: auxiliaryId, month: prevMonth })
        .chain('lean')
        .returns(prevPay);
      CompanyModel
        .expects('findOne')
        .withExactArgs({ _id: companyId })
        .chain('lean')
        .returns(company);
      SurchargeModel
        .expects('find')
        .withExactArgs({ company: companyId })
        .chain('lean')
        .returns(surcharges);
      DistanceMatrixModel
        .expects('find')
        .withExactArgs({ company: companyId })
        .chain('lean')
        .returns(distanceMatrix);
      getContractStub.returns();

      await PayHelper.hoursBalanceDetail(auxiliaryId, month, credentials);
    } catch (e) {
      expect(e).toEqual(Boom.badRequest());
    } finally {
      sinon.assert.calledWithExactly(getEventsToPayStub, startDate, endDate, [new ObjectID(auxiliaryId)], companyId);
      sinon.assert.calledWithExactly(getCustomerCountStub, events);
      sinon.assert.calledWithExactly(
        getPreviousMonthPayStub,
        [{ ...auxiliary, prevPay }],
        query,
        surcharges,
        distanceMatrix,
        companyId
      );
      sinon.assert.calledWithExactly(getContractStub, auxiliary.contracts, startDate, endDate);
    }
  });

  it('should return null if no draftPay', async () => {
    PayModel
      .expects('findOne')
      .withExactArgs({ auxiliary: auxiliaryId, month })
      .chain('lean')
      .returns();

    const events = [{ _id: new ObjectID() }];
    const auxiliaryEvent = { auxiliary: { _id: auxiliaryId }, events, absences: [] };
    getEventsToPayStub.returns([auxiliaryEvent]);
    getCustomerCountStub.returns(customersCount);

    const auxiliary = { _id: auxiliaryId, contracts: { startDate: '2018-11-01' } };
    UserModel
      .expects('findOne')
      .withExactArgs({ _id: auxiliaryId })
      .chain('populate')
      .chain('lean')
      .returns(auxiliary);
    PayModel
      .expects('findOne')
      .withExactArgs({ auxiliary: auxiliaryId, month: prevMonth })
      .chain('lean')
      .returns(prevPay);
    CompanyModel
      .expects('findOne')
      .withExactArgs({ _id: companyId })
      .chain('lean')
      .returns(company);
    SurchargeModel
      .expects('find')
      .withExactArgs({ company: companyId })
      .chain('lean')
      .returns(surcharges);
    DistanceMatrixModel
      .expects('find')
      .withExactArgs({ company: companyId })
      .chain('lean')
      .returns(distanceMatrix);

    computeAuxiliaryDraftPayStub.returns();
    const contract = { startDate: '2018-11-12' };
    getContractStub.returns(contract);
    getPreviousMonthPayStub.returns(prevPayList);

    const result = await PayHelper.hoursBalanceDetail(auxiliaryId, month, credentials);

    expect(result).toBe(null);
    sinon.assert.calledWithExactly(getEventsToPayStub, startDate, endDate, [new ObjectID(auxiliaryId)], companyId);
    sinon.assert.calledWithExactly(getCustomerCountStub, events);
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
  });
});

describe('computeHoursToWork', () => {
  const contractQuery = {
    startDate: moment('122019', 'MMYYYY').startOf('M').toDate(),
    endDate: moment('122019', 'MMYYYY').endOf('M').toDate(),
  };
  let getContractMonthInfoStub;
  let getPayFromAbsences;

  beforeEach(() => {
    getContractMonthInfoStub = sinon.stub(DraftPayHelper, 'getContractMonthInfo');
    getPayFromAbsences = sinon.stub(DraftPayHelper, 'getPayFromAbsences');
  });

  afterEach(() => {
    getContractMonthInfoStub.restore();
    getPayFromAbsences.restore();
  });

  it('should compute hours to work with absences', () => {
    const contracts = [{ _id: new ObjectID(), absences: [{ _id: new ObjectID() }] }];
    getContractMonthInfoStub.returns({ contractHours: 85, holidaysHours: 5 });
    getPayFromAbsences.returns(6);

    const result = PayHelper.computeHoursToWork('122019', contracts);
    expect(result).toBe(74);
    sinon.assert.calledWithExactly(
      getContractMonthInfoStub,
      contracts[0],
      contractQuery
    );
    sinon.assert.calledWithExactly(
      getPayFromAbsences,
      contracts[0].absences,
      contracts[0],
      contractQuery
    );
  });

  it('should compute hours to work without absences', () => {
    const contracts = [{ _id: new ObjectID(), absences: [] }, { _id: new ObjectID(), absences: [] }];
    getContractMonthInfoStub.onCall(0).returns({ contractHours: 85, holidaysHours: 5 });
    getContractMonthInfoStub.onCall(1).returns({ contractHours: 100, holidaysHours: 5 });

    const result = PayHelper.computeHoursToWork('122019', contracts);
    expect(result).toBe(175);
    sinon.assert.calledWithExactly(
      getContractMonthInfoStub.getCall(0),
      contracts[0],
      contractQuery
    );
    sinon.assert.calledWithExactly(
      getContractMonthInfoStub.getCall(1),
      contracts[1],
      contractQuery
    );
    sinon.assert.notCalled(getPayFromAbsences);
  });
});

describe('getHoursToWorkBySector', () => {
  const credentials = { company: { _id: new ObjectID() } };
  let getContractsAndAbsencesBySectorStub;
  let computeHoursToWorkStub;

  beforeEach(() => {
    getContractsAndAbsencesBySectorStub = sinon.stub(UserRepository, 'getContractsAndAbsencesBySector');
    computeHoursToWorkStub = sinon.stub(PayHelper, 'computeHoursToWork');
  });

  afterEach(() => {
    getContractsAndAbsencesBySectorStub.restore();
    computeHoursToWorkStub.restore();
  });

  it('should return hours to work by sector (sectors as array + absences)', async () => {
    const query = { sector: ['507f191e810c19729de860ea', '507f1f77bcf86cd799439011'], month: '122019' };
    const contractAndAbsences = [
      {
        _id: query.sector[0],
        contracts: [
          { _id: new ObjectID(), absences: [] },
          { _id: new ObjectID(), absences: [] },
        ],
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
    sinon.assert.calledWithExactly(
      computeHoursToWorkStub.getCall(0),
      query.month,
      contractAndAbsences[0].contracts
    );
    sinon.assert.calledWithExactly(
      computeHoursToWorkStub.getCall(1),
      query.month,
      contractAndAbsences[1].contracts
    );
  });

  it('should return hours to work by sector (sectors as string + no absences)', async () => {
    const query = { sector: '507f191e810c19729de860ea', month: '122019' };
    const contractAndAbsences = [
      {
        _id: query.sector,
        contracts: [
          { _id: new ObjectID(), absences: [] },
          { _id: new ObjectID(), absences: [] },
        ],
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
    sinon.assert.calledWithExactly(
      computeHoursToWorkStub,
      query.month,
      contractAndAbsences[0].contracts
    );
  });
});
