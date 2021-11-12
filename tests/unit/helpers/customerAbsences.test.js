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
    const query = { customer: new ObjectID(), startDate: '2021-09-09T00:00:00', endDate: '2021-12-09T00:00:00' };
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

    findCustomerAbsence.returns(SinonMongoose.stubChainedQueries([[customerAbsences], ['populate', 'lean']]));

    await CustomerAbsenceHelper.list(query, credentials);

    SinonMongoose.calledWithExactly(
      findCustomerAbsence,
      [
        {
          query: 'find',
          args: [{
            customer: { $in: query.customer },
            startDate: { $gte: query.startDate },
            endDate: { $lte: query.endDate },
            company: companyId,
          }],
        },
        { query: 'populate', args: [{ path: 'customer', select: 'contact identity' }] },
        { query: 'lean' },
      ]
    );
  });
});
