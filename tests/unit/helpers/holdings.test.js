const sinon = require('sinon');
const { expect } = require('expect');
const { ObjectId } = require('mongodb');
const Holding = require('../../../src/models/Holding');
const HoldingHelper = require('../../../src/helpers/holdings');
const SinonMongoose = require('../sinonMongoose');

describe('create', () => {
  let create;
  beforeEach(() => {
    create = sinon.stub(Holding, 'create');
  });
  afterEach(() => {
    create.restore();
  });

  it('should create a holding', async () => {
    const payload = { name: 'Test SAS', address: '24 avenue Daumesnil 75012 Paris' };

    await HoldingHelper.create(payload);

    sinon.assert.calledOnceWithExactly(create, payload);
  });
});

describe('list', () => {
  let find;
  beforeEach(() => {
    find = sinon.stub(Holding, 'find');
  });
  afterEach(() => {
    find.restore();
  });

  it('should return holdings', async () => {
    const holdingList = [{ _id: new ObjectId(), name: 'Holding' }];
    find.returns(SinonMongoose.stubChainedQueries(holdingList, ['lean']));

    const result = await HoldingHelper.list();

    expect(result).toEqual(holdingList);
    SinonMongoose.calledOnceWithExactly(
      find,
      [{ query: 'find', args: [{}, { _id: 1, name: 1 }] }, { query: 'lean', args: [] }]
    );
  });
});
