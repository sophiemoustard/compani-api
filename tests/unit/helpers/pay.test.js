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
  let formatSurchargeDetail;
  beforeEach(() => {
    formatSurchargeDetail = sinon.stub(PayHelper, 'formatSurchargeDetail');
  });
  afterEach(() => {
    formatSurchargeDetail.restore();
  });

  it('return empty object if empty object given', () => {
    const result = PayHelper.formatPay({});
    expect(result).toEqual({});
  });

  it('should format pay with surchargedAndExemptDetails', () => {
    const draftPay = { _id: 'toto', surchargedAndExemptDetails: { evenings: 3 } };
    formatSurchargeDetail.returns({ test: 1 });

    const result = PayHelper.formatPay(draftPay);
    expect(result).toEqual({
      _id: 'toto',
      surchargedAndExemptDetails: { test: 1 },
    });
    sinon.assert.callCount(formatSurchargeDetail, 1);
  });

  it('should format pay with diff', () => {
    const draftPay = { _id: 'toto', diff: { surchargedAndExemptDetails: { evenings: 3 } } };
    formatSurchargeDetail.returns({ test: 1 });

    const result = PayHelper.formatPay(draftPay);
    expect(result).toEqual({
      _id: 'toto',
      diff: { surchargedAndExemptDetails: { test: 1 } },
    });
    sinon.assert.callCount(formatSurchargeDetail, 1);
  });

  it('should format pay with dibothff', () => {
    const draftPay = {
      _id: 'toto',
      diff: { surchargedAndExemptDetails: { evenings: 3 } },
      surchargedAndExemptDetails: { custom: 3 },
    };
    formatSurchargeDetail.returns({ test: 1 });

    const result = PayHelper.formatPay(draftPay);
    expect(result).toEqual({
      _id: 'toto',
      diff: { surchargedAndExemptDetails: { test: 1 } },
      surchargedAndExemptDetails: { test: 1 },
    });
    sinon.assert.callCount(formatSurchargeDetail, 2);
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
    sinon.assert.calledWithExactly(getPreviousMonthPayStub, [{ ...auxiliary, prevPay }], query, surcharges, distanceMatrix, companyId);
    sinon.assert.calledWithExactly(getContractStub, auxiliary.contracts, startDate, endDate);
    sinon.assert.calledWithExactly(computeAuxiliaryDraftPayStub, auxiliary, contract, auxiliaryEvent, prevPayList[0], company, query, distanceMatrix, surcharges);
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
      sinon.assert.calledWithExactly(getEventsToPayStub, startDate, endDate, [new ObjectID(auxiliaryId)], companyId);
      sinon.assert.calledWithExactly(getCustomerCountStub, events);
      sinon.assert.calledWithExactly(getPreviousMonthPayStub, [{ ...auxiliary, prevPay }], query, surcharges, distanceMatrix, companyId);
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
    sinon.assert.calledWithExactly(getPreviousMonthPayStub, [{ ...auxiliary, prevPay }], query, surcharges, distanceMatrix, companyId);
    sinon.assert.calledWithExactly(getContractStub, auxiliary.contracts, startDate, endDate);
    sinon.assert.calledWithExactly(computeAuxiliaryDraftPayStub, auxiliary, contract, auxiliaryEvent, prevPayList[0], company, query, distanceMatrix, surcharges);
  });
});
