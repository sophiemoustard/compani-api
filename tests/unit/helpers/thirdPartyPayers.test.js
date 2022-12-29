const sinon = require('sinon');
const { expect } = require('expect');
const { ObjectId } = require('mongodb');
const ThirdPartyPayer = require('../../../src/models/ThirdPartyPayer');
const ThirdPartyPayersHelper = require('../../../src/helpers/thirdPartyPayers');
const SinonMongoose = require('../sinonMongoose');

describe('create', () => {
  let create;
  beforeEach(() => {
    create = sinon.stub(ThirdPartyPayer, 'create');
  });
  afterEach(() => {
    create.restore();
  });

  it('should create a new thirdPartyPayer', async () => {
    const payload = {
      _id: new ObjectId(),
      name: 'Titi',
      address: {
        street: '42, avenue des Colibris',
        fullAddress: '42, avenue des Colibris 75020 Paris',
        zipCode: '75020',
        city: 'Paris',
        location: { type: 'Point', coordinates: [4.849302, 2.90887] },
      },
      isApa: false,
      billingMode: 'indirect',
    };
    const credentials = { company: { _id: new ObjectId() } };
    const payloadWithCompany = { ...payload, company: credentials.company._id };

    create.returns(SinonMongoose.stubChainedQueries(payloadWithCompany, ['toObject']));

    const result = await ThirdPartyPayersHelper.create(payload, credentials);

    expect(result).toMatchObject(payloadWithCompany);
    SinonMongoose.calledOnceWithExactly(
      create,
      [{ query: 'create', args: [payloadWithCompany] }, { query: 'toObject' }]
    );
  });
});

describe('list', () => {
  let find;
  beforeEach(() => {
    find = sinon.stub(ThirdPartyPayer, 'find');
  });
  afterEach(() => {
    find.restore();
  });

  it('should list tpp', async () => {
    const credentials = { company: { _id: new ObjectId() } };
    const tppList = [{ _id: new ObjectId() }, { _id: new ObjectId() }];

    find.returns(SinonMongoose.stubChainedQueries(tppList, ['lean']));

    const result = await ThirdPartyPayersHelper.list(credentials);

    expect(result).toMatchObject(tppList);
    SinonMongoose.calledOnceWithExactly(
      find,
      [{ query: 'find', args: [{ company: credentials.company._id }] }, { query: 'lean' }]
    );
  });
});

describe('update', () => {
  let findOneAndUpdate;
  beforeEach(() => {
    findOneAndUpdate = sinon.stub(ThirdPartyPayer, 'findOneAndUpdate');
  });
  afterEach(() => {
    findOneAndUpdate.restore();
  });

  it('should update a tpp', async () => {
    const payload = { siret: '13605658901234' };
    const tppId = new ObjectId();

    findOneAndUpdate.returns(SinonMongoose.stubChainedQueries({ _id: tppId }, ['lean']));

    const result = await ThirdPartyPayersHelper.update(tppId, payload);

    expect(result).toMatchObject({ _id: tppId });
    SinonMongoose.calledOnceWithExactly(
      findOneAndUpdate,
      [
        { query: 'findOneAndUpdate', args: [{ _id: tppId }, { $set: payload }, { new: true }] },
        { query: 'lean' },
      ]
    );
  });
});

describe('delete', () => {
  let deleteOne;
  beforeEach(() => {
    deleteOne = sinon.stub(ThirdPartyPayer, 'deleteOne');
  });
  afterEach(() => {
    deleteOne.restore();
  });
  it('should remove an tpp', async () => {
    const tppId = new ObjectId();

    await ThirdPartyPayersHelper.delete(tppId);

    sinon.assert.calledOnceWithExactly(deleteOne, { _id: tppId });
  });
});
