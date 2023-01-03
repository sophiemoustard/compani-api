const { ObjectId } = require('mongodb');
const sinon = require('sinon');
const moment = require('moment');
const { expect } = require('expect');
const SinonMongoose = require('../sinonMongoose');
const CustomerAbsence = require('../../../src/models/CustomerAbsence');
const CustomerAbsencesHelper = require('../../../src/helpers/customerAbsences');
const UtilsHelper = require('../../../src/helpers/utils');
const EventsHelper = require('../../../src/helpers/events');

describe('createAbsence', () => {
  let create;
  beforeEach(() => {
    create = sinon.stub(CustomerAbsence, 'create');
  });
  afterEach(() => {
    create.restore();
  });

  it('should create customer absence', async () => {
    const companyId = new ObjectId();
    const payload = {
      startDate: new Date(),
      endDate: moment(new Date()).endOf('d').toDate(),
      customer: new ObjectId(),
      absenceType: 'leave',
    };
    await CustomerAbsencesHelper.create(payload, companyId);

    sinon.assert.calledOnceWithExactly(create, { ...payload, company: companyId });
  });
});

describe('list', () => {
  let findCustomerAbsence;
  let formatIdsArray;
  beforeEach(() => {
    findCustomerAbsence = sinon.stub(CustomerAbsence, 'find');
    formatIdsArray = sinon.stub(UtilsHelper, 'formatIdsArray');
  });
  afterEach(() => {
    findCustomerAbsence.restore();
    formatIdsArray.restore();
  });

  it('should get absences of a customer', async () => {
    const companyId = new ObjectId();
    const customerId = new ObjectId();
    const credentials = { company: { _id: companyId } };
    const query = { customer: customerId, startDate: '2021-09-09T00:00:00', endDate: '2021-12-09T00:00:00' };
    const customerAbsences = [
      {
        company: companyId,
        customer: query.customer,
        startDate: '2019-09-20T00:00:00',
        endDate: '2019-09-22T00:00:00',
        absenceType: 'leave',
      },
      {
        company: companyId,
        customer: query.customer,
        startDate: '2021-11-20T00:00:00',
        endDate: '2021-11-25T00:00:00',
        absenceType: 'other',
      },
    ];

    formatIdsArray.returns([customerId]);
    findCustomerAbsence.returns(SinonMongoose.stubChainedQueries([customerAbsences]));

    await CustomerAbsencesHelper.list(query, credentials);

    sinon.assert.calledOnceWithExactly(formatIdsArray, customerId);
    SinonMongoose.calledOnceWithExactly(
      findCustomerAbsence,
      [
        {
          query: 'find',
          args: [{
            customer: { $in: [customerId] },
            startDate: { $lte: '2021-12-09T00:00:00' },
            endDate: { $gte: '2021-09-09T00:00:00' },
            company: companyId,
          }],
        },
        { query: 'populate', args: [{ path: 'customer', select: 'identity' }] },
        { query: 'lean' },
      ]
    );
  });

  it('should get absences of several customers', async () => {
    const companyId = new ObjectId();
    const customers = [new ObjectId(), new ObjectId()];
    const credentials = { company: { _id: companyId } };
    const query = { customer: customers, startDate: '2021-09-09T00:00:00', endDate: '2021-12-09T00:00:00' };
    const customerAbsences = [
      {
        company: companyId,
        customer: query.customer,
        startDate: '2019-09-20T00:00:00',
        endDate: '2019-09-22T00:00:00',
        absenceType: 'leave',
      },
      {
        company: companyId,
        customer: query.customer,
        startDate: '2021-11-20T00:00:00',
        endDate: '2021-11-25T00:00:00',
        absenceType: 'other',
      },
    ];

    formatIdsArray.returns(customers);
    findCustomerAbsence.returns(SinonMongoose.stubChainedQueries([customerAbsences]));

    await CustomerAbsencesHelper.list(query, credentials);

    sinon.assert.calledOnceWithExactly(formatIdsArray, customers);
    SinonMongoose.calledOnceWithExactly(
      findCustomerAbsence,
      [
        {
          query: 'find',
          args: [{
            customer: { $in: customers },
            startDate: { $lte: '2021-12-09T00:00:00' },
            endDate: { $gte: '2021-09-09T00:00:00' },
            company: companyId,
          }],
        },
        { query: 'populate', args: [{ path: 'customer', select: 'identity' }] },
        { query: 'lean' },
      ]
    );
  });
});

describe('isAbsent', () => {
  let countDocuments;
  beforeEach(() => {
    countDocuments = sinon.stub(CustomerAbsence, 'countDocuments');
  });
  afterEach(() => {
    countDocuments.restore();
  });

  it('should return true if customer is absent', async () => {
    const customer = new ObjectId();
    const date = new Date('2019-11-01');

    countDocuments.returns(1);

    const result = await CustomerAbsencesHelper.isAbsent(customer, date);

    expect(result).toEqual(true);
    sinon.assert.calledOnceWithExactly(
      countDocuments,
      { customer, startDate: { $lte: new Date('2019-11-01') }, endDate: { $gte: new Date('2019-11-01') } }
    );
  });

  it('should return false if customer is not absent', async () => {
    const customer = new ObjectId();
    const date = new Date('2019-11-01');

    countDocuments.returns(0);

    const result = await CustomerAbsencesHelper.isAbsent(customer, date);

    expect(result).toEqual(false);
  });
});

describe('updateCustomerAbsence', () => {
  let findOne;
  let deleteCustomerEvents;
  let updateOne;
  beforeEach(() => {
    findOne = sinon.stub(CustomerAbsence, 'findOne');
    deleteCustomerEvents = sinon.stub(EventsHelper, 'deleteCustomerEvents');
    updateOne = sinon.stub(CustomerAbsence, 'updateOne');
  });
  afterEach(() => {
    findOne.restore();
    deleteCustomerEvents.restore();
    updateOne.restore();
  });

  it('should update absence and remove events on this period', async () => {
    const customerAbsenceId = new ObjectId();
    const customer = new ObjectId();
    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId } };
    const startDate = new Date('2021-11-28');
    const endDate = new Date('2021-12-10');
    const customerAbsence = { _id: customerAbsenceId, customer };
    const payload = { absenceType: 'hospitalization', startDate, endDate };

    findOne.returns(SinonMongoose.stubChainedQueries(customerAbsence, ['lean']));

    await CustomerAbsencesHelper.updateCustomerAbsence(customerAbsenceId, payload, credentials);

    SinonMongoose.calledOnceWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ _id: customerAbsenceId, company: companyId }, { customer: 1 }] },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledOnceWithExactly(deleteCustomerEvents, customer, startDate, endDate, null, credentials);
    sinon.assert.calledOnceWithExactly(
      updateOne,
      { _id: customerAbsenceId, company: companyId },
      { absenceType: 'hospitalization', startDate, endDate }
    );
  });
});

describe('updateCustomerAbsencesOnCustomerStop', () => {
  let deleteMany;
  let updateMany;
  beforeEach(() => {
    deleteMany = sinon.stub(CustomerAbsence, 'deleteMany');
    updateMany = sinon.stub(CustomerAbsence, 'updateMany');
  });
  afterEach(() => {
    deleteMany.restore();
    updateMany.restore();
  });

  it('should delete absence after stoppedDate and update absences before ', async () => {
    const customer = new ObjectId();
    const stoppedAt = new Date('2019-11-01');

    await CustomerAbsencesHelper.updateCustomerAbsencesOnCustomerStop(customer, stoppedAt);

    sinon.assert.calledOnceWithExactly(deleteMany, { customer, startDate: { $gte: new Date('2019-11-01') } });
    sinon.assert.calledOnceWithExactly(
      updateMany,
      { customer, startDate: { $lt: new Date('2019-11-01') }, endDate: { $gt: new Date('2019-11-01') } },
      { endDate: new Date('2019-11-01') }
    );
  });
});

describe('delete', () => {
  let deleteOne;
  beforeEach(() => {
    deleteOne = sinon.stub(CustomerAbsence, 'deleteOne');
  });
  afterEach(() => {
    deleteOne.restore();
  });

  it('should delete customer absence', async () => {
    const customerAbsenceId = new ObjectId();

    await CustomerAbsencesHelper.delete(customerAbsenceId);

    sinon.assert.calledOnceWithExactly(deleteOne, { _id: customerAbsenceId });
  });
});
