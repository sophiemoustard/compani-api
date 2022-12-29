const sinon = require('sinon');
const { expect } = require('expect');
const { ObjectId } = require('mongodb');
const Sector = require('../../../src/models/Sector');
const SectorsHelper = require('../../../src/helpers/sectors');
const SinonMongoose = require('../sinonMongoose');

describe('create', () => {
  let create;
  beforeEach(() => {
    create = sinon.stub(Sector, 'create');
  });
  afterEach(() => {
    create.restore();
  });

  it('should create a new sector', async () => {
    const payload = { name: 'toto' };
    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId } };

    create.returns(SinonMongoose.stubChainedQueries({ name: 'toto', company: companyId }, ['toObject']));

    const result = await SectorsHelper.create(payload, credentials);

    expect(result).toMatchObject({ name: 'toto', company: companyId });

    SinonMongoose.calledOnceWithExactly(
      create,
      [
        { query: 'create', args: [{ name: 'toto', company: companyId }] },
        { query: 'toObject' },
      ]
    );
  });
});

describe('list', () => {
  let find;
  beforeEach(() => {
    find = sinon.stub(Sector, 'find');
  });
  afterEach(() => {
    find.restore();
  });

  it('should list sectors', async () => {
    const credentials = { company: { _id: new ObjectId() } };
    const companyId = credentials.company._id;

    find.returns(SinonMongoose.stubChainedQueries({ name: 'toto', company: companyId }, ['lean']));

    await SectorsHelper.list(credentials);

    SinonMongoose.calledOnceWithExactly(
      find,
      [
        { query: 'find', args: [{ company: companyId }] },
        { query: 'lean' },
      ]
    );
  });
});

describe('update', () => {
  let findOneAndUpdate;
  beforeEach(() => {
    findOneAndUpdate = sinon.stub(Sector, 'findOneAndUpdate');
  });
  afterEach(() => {
    findOneAndUpdate.restore();
  });

  it('should update a sector', async () => {
    const payload = { name: 'Tutu' };
    const sectorId = new ObjectId();
    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId } };

    findOneAndUpdate.returns(SinonMongoose.stubChainedQueries(null, ['lean']));

    await SectorsHelper.update(sectorId, payload, credentials);

    SinonMongoose.calledOnceWithExactly(
      findOneAndUpdate,
      [
        { query: 'findOneAndUpdate', args: [{ _id: sectorId }, { $set: payload }, { new: true }] },
        { query: 'lean' },
      ]
    );
  });
});

describe('remove', () => {
  let deleteOne;
  beforeEach(() => {
    deleteOne = sinon.stub(Sector, 'deleteOne');
  });
  afterEach(() => {
    deleteOne.restore();
  });

  it('should remove an sector', async () => {
    const sectorId = new ObjectId();

    await SectorsHelper.remove(sectorId);

    sinon.assert.calledOnceWithExactly(deleteOne, { _id: sectorId });
  });
});
