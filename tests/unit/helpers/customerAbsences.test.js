const { ObjectID } = require('mongodb');
const sinon = require('sinon');
const SinonMongoose = require('../sinonMongoose');
const CustomerAbsence = require('../../../src/models/CustomerAbsence');
const CustomerAbsenceHelper = require('../../../src/helpers/customerAbsences');

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
    await CustomerAbsenceHelper.create(payload, companyId);

    sinon.assert.calledOnceWithExactly(create, { ...payload, company: companyId });
  });
});

describe('list', () => {
  let findCustomerAbsence;
  beforeEach(() => {
    findCustomerAbsence = sinon.stub(CustomerAbsence, 'find');
  });
  afterEach(() => {
    findCustomerAbsence.restore();
  });

  it('should get customer absences', async () => {
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };
    const payload = { customer: new ObjectID() };
    const customerAbsences = [
      {
        company: companyId,
        customer: payload.customer,
        startDate: new Date(),
        endDate: new Date(),
        absenceType: 'leave',
      },
      {
        company: companyId,
        customer: payload.customer,
        startDate: new Date(),
        endDate: new Date(),
        absenceType: 'other',
      },
    ];

    findCustomerAbsence.returns(SinonMongoose.stubChainedQueries([[customerAbsences], ['populate', 'lean']]));
    await CustomerAbsenceHelper.list(payload, credentials);

    SinonMongoose.calledWithExactly(
      findCustomerAbsence,
      [
        { query: 'find', args: [{ customer: payload.customer, company: companyId }] },
        { query: 'populate', args: [{ path: 'customer', select: 'contact identity' }] },
        { query: 'lean' },
      ]
    );
  });
});
