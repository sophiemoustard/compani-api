const { ObjectID } = require('mongodb');
const expect = require('expect');
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
    const query = { customer: new ObjectID() };
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };
    const helpers = [
      { _id: new ObjectID(), user: { local: { email: 'helper1@test.fr' } }, customer: query.customer, referent: true },
      { _id: new ObjectID(), user: { local: { email: 'helper2@test.fr' } }, customer: query.customer, referent: false },
    ];

    find.returns(SinonMongoose.stubChainedQueries([helpers]));

    const result = await HelpersHelper.list(query, credentials);

    expect(result).toEqual([
      { local: { email: 'helper1@test.fr' }, helperId: helpers[0]._id, isReferent: helpers[0].referent },
      { local: { email: 'helper2@test.fr' }, helperId: helpers[1]._id, isReferent: helpers[1].referent },
    ]);
    SinonMongoose.calledWithExactly(
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
    const helperId = new ObjectID();
    const customerId = new ObjectID();
    const helper = { _id: helperId, customer: customerId };

    findOneAndUpdate.returns(SinonMongoose.stubChainedQueries([helper], ['lean']));

    await HelpersHelper.update(helperId, { referent: true });

    SinonMongoose.calledWithExactly(
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
    const credentials = { company: { _id: new ObjectID() } };
    const userId = new ObjectID();
    const customerId = new ObjectID();

    countDocuments.returns(1);

    await HelpersHelper.create(userId, customerId, credentials.company._id);

    sinon.assert.calledOnceWithExactly(
      create,
      { user: userId, customer: customerId, company: credentials.company._id, referent: false }
    );
  });

  it('should create a referent helper', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    const userId = new ObjectID();
    const customerId = new ObjectID();

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
    const userId = new ObjectID();

    await HelpersHelper.remove(userId);

    sinon.assert.calledOnceWithExactly(deleteMany, { user: userId });
  });
});
