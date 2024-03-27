const sinon = require('sinon');
const { expect } = require('expect');
const flat = require('flat');
const { ObjectId } = require('mongodb');
const Customer = require('../../../src/models/Customer');
const MandatesHelper = require('../../../src/helpers/mandates');
const SinonMongoose = require('../sinonMongoose');

describe('getMandates', () => {
  let findOneCustomer;
  beforeEach(() => {
    findOneCustomer = sinon.stub(Customer, 'findOne');
  });
  afterEach(() => {
    findOneCustomer.restore();
  });

  it('should return customer mandates', async () => {
    const customerId = (new ObjectId()).toHexString();
    const mandate = { _id: new ObjectId() };

    findOneCustomer.returns(SinonMongoose.stubChainedQueries(mandate, ['lean']));

    const result = await MandatesHelper.getMandates(customerId);

    expect(result).toMatchObject(mandate);
    SinonMongoose.calledOnceWithExactly(
      findOneCustomer,
      [
        {
          query: 'findOne',
          args: [
            { _id: customerId, 'payment.mandates': { $exists: true } },
            { identity: 1, 'payment.mandates': 1 },
            { autopopulate: false },
          ],
        },
        { query: 'lean' },
      ]
    );
  });
});

describe('updateMandate', () => {
  let findOneAndUpdateCustomer;
  beforeEach(() => {
    findOneAndUpdateCustomer = sinon.stub(Customer, 'findOneAndUpdate');
  });
  afterEach(() => {
    findOneAndUpdateCustomer.restore();
  });

  it('should update customer mandates', async () => {
    const customerId = (new ObjectId()).toHexString();
    const mandateId = '1234567890';
    const payload = { startDate: '2019-12-12T00:00:00' };

    findOneAndUpdateCustomer.returns(SinonMongoose.stubChainedQueries({ ...payload, _id: mandateId }, ['lean']));

    const result = await MandatesHelper.updateMandate(customerId, mandateId, payload);

    expect(result).toMatchObject({ ...payload, _id: mandateId });
    SinonMongoose.calledOnceWithExactly(
      findOneAndUpdateCustomer,
      [
        {
          query: 'findOneAndUpdate',
          args: [
            { _id: customerId, 'payment.mandates._id': mandateId },
            { $set: flat({ 'payment.mandates.$': { ...payload } }) },
            { new: true, select: { identity: 1, 'payment.mandates': 1 }, autopopulate: false },
          ],
        },
        { query: 'lean' },
      ]
    );
  });
});
