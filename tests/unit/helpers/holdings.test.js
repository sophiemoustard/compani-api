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

  it('should create a holding with address', async () => {
    const payload = {
      name: 'Test SAS',
      address: {
        fullAddress: '24 avenue Daumesnil 75012 Paris',
        street: '24 avenue Daumesnil',
        zipCode: '75012',
        city: 'Paris',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
    };

    await HoldingHelper.create(payload);

    sinon.assert.calledOnceWithExactly(create, payload);
  });

  it('should create a holding without address', async () => {
    const payload = {
      name: 'Test SAS',
      address: {},
    };

    await HoldingHelper.create(payload);

    sinon.assert.calledOnceWithExactly(create, { name: 'Test SAS' });
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
