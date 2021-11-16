const { ObjectID } = require('bson');
const sinon = require('sinon');
const moment = require('moment');
const expect = require('expect');
const CustomerAbsence = require('../../src/models/CustomerAbsence');
const CustomerAbsenceHelper = require('../../src/helpers/customerAbsences');

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

    sinon.assert.calledOnceWithExactly(
      create,
      { ...payload, endDate: moment(payload.endDate).subtract(1, 'm').add(1, 'd'), company: companyId }
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
    const customer = new ObjectID();
    const date = new Date('2019-11-01');

    countDocuments.returns(1);

    const result = await CustomerAbsenceHelper.isAbsent(customer, date);

    expect(result).toEqual(true);
    sinon.assert.calledOnceWithExactly(
      countDocuments,
      { customer, startDate: { $lte: new Date('2019-11-01') }, endDate: { $gte: new Date('2019-11-01') } }
    );
  });

  it('should return false if customer is not absent', async () => {
    const customer = new ObjectID();
    const date = new Date('2019-11-01');

    countDocuments.returns(0);

    const result = await CustomerAbsenceHelper.isAbsent(customer, date);

    expect(result).toEqual(false);
  });
});
