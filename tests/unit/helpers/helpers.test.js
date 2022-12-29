const { ObjectId } = require('mongodb');
const { expect } = require('expect');
const sinon = require('sinon');
const HelpersHelper = require('../../../src/helpers/helpers');
const Helper = require('../../../src/models/Helper');
const SinonMongoose = require('../sinonMongoose');

describe('list', () => {
  let find;
  beforeEach(() => {
    find = sinon.stub(Helper, 'find');
  });
  afterEach(() => {
    find.restore();
  });

  it('should get helpers', async () => {
    const query = { customer: new ObjectId() };
    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId } };
    const helpers = [
      { _id: new ObjectId(), user: { local: { email: 'helper1@test.fr' } }, customer: query.customer, referent: true },
      { _id: new ObjectId(), user: { local: { email: 'helper2@test.fr' } }, customer: query.customer, referent: false },
    ];

    find.returns(SinonMongoose.stubChainedQueries(helpers));

    const result = await HelpersHelper.list(query, credentials);

    expect(result).toEqual([
      {
        _id: helpers[0]._id,
        user: { local: { email: 'helper1@test.fr' } },
        referent: true,
        customer: query.customer,
      },
      {
        _id: helpers[1]._id,
        user: { local: { email: 'helper2@test.fr' } },
        referent: false,
        customer: query.customer,
      },
    ]);
    SinonMongoose.calledOnceWithExactly(
      find,
      [
        { query: 'find', args: [{ customer: query.customer, company: companyId }] },
        { query: 'populate', args: [{ path: 'user', select: 'identity local contact createdAt' }] },
        { query: 'lean' },
      ]
    );
  });
});

describe('update', () => {
  let findOneAndUpdate;
  let updateOne;
  beforeEach(() => {
    findOneAndUpdate = sinon.stub(Helper, 'findOneAndUpdate');
    updateOne = sinon.stub(Helper, 'updateOne');
  });
  afterEach(() => {
    findOneAndUpdate.restore();
    updateOne.restore();
  });

  it('should update the referent helper', async () => {
    const helperId = new ObjectId();
    const customerId = new ObjectId();
    const helper = { _id: helperId, customer: customerId };

    findOneAndUpdate.returns(SinonMongoose.stubChainedQueries(helper, ['lean']));

    await HelpersHelper.update(helperId, { referent: true });

    SinonMongoose.calledOnceWithExactly(
      findOneAndUpdate,
      [{ query: 'findOneAndUpdate', args: [{ _id: helperId }, { $set: { referent: true } }] }, { query: 'lean' }]
    );
    sinon.assert.calledOnceWithExactly(
      updateOne,
      { _id: { $ne: helper._id }, customer: helper.customer, referent: true },
      { $set: { referent: false } }
    );
  });
});

describe('create', () => {
  let create;
  let countDocuments;
  beforeEach(() => {
    create = sinon.stub(Helper, 'create');
    countDocuments = sinon.stub(Helper, 'countDocuments');
  });
  afterEach(() => {
    create.restore();
    countDocuments.restore();
  });

  it('should create a non referent helper', async () => {
    const credentials = { company: { _id: new ObjectId() } };
    const userId = new ObjectId();
    const customerId = new ObjectId();

    countDocuments.returns(1);

    await HelpersHelper.create(userId, customerId, credentials.company._id);

    sinon.assert.calledOnceWithExactly(
      create,
      { user: userId, customer: customerId, company: credentials.company._id, referent: false }
    );
  });

  it('should create a referent helper', async () => {
    const credentials = { company: { _id: new ObjectId() } };
    const userId = new ObjectId();
    const customerId = new ObjectId();

    countDocuments.returns(0);

    await HelpersHelper.create(userId, customerId, credentials.company._id);

    sinon.assert.calledOnceWithExactly(
      create,
      { user: userId, customer: customerId, company: credentials.company._id, referent: true }
    );
  });
});

describe('remove', () => {
  let deleteMany;
  beforeEach(() => {
    deleteMany = sinon.stub(Helper, 'deleteMany');
  });
  afterEach(() => {
    deleteMany.restore();
  });

  it('should delete a helper', async () => {
    const userId = new ObjectId();

    await HelpersHelper.remove(userId);

    sinon.assert.calledOnceWithExactly(deleteMany, { user: userId });
  });
});
