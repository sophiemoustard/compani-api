const { ObjectID } = require('mongodb');
const sinon = require('sinon');
const SinonMongoose = require('../sinonMongoose');
const CustomerAbsence = require('../../../src/models/CustomerAbsence');
const CustomerAbsencesHelper = require('../../../src/helpers/customerAbsences');
const UtilsHelper = require('../../../src/helpers/utils');

describe('createAbsence', () => {
  let create;
  beforeEach(() => {
    create = sinon.stub(CustomerAbsence, 'create');
  });
  afterEach(() => {
    create.restore();
  });

  it('should create customer absence', async () => {
    const companyId = new ObjectID();
    const payload = {
      startDate: new Date(),
      endDate: new Date(),
      customer: new ObjectID(),
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
    const companyId = new ObjectID();
    const customerId = new ObjectID();
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
    findCustomerAbsence.returns(SinonMongoose.stubChainedQueries([[customerAbsences]]));

    await CustomerAbsencesHelper.list(query, credentials);

    sinon.assert.calledOnceWithExactly(formatIdsArray, customerId);
    SinonMongoose.calledWithExactly(
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
    const companyId = new ObjectID();
    const customers = [new ObjectID(), new ObjectID()];
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
    findCustomerAbsence.returns(SinonMongoose.stubChainedQueries([[customerAbsences]]));

    await CustomerAbsencesHelper.list(query, credentials);

    sinon.assert.calledOnceWithExactly(formatIdsArray, customers);
    SinonMongoose.calledWithExactly(
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
