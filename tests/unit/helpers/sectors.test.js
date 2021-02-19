const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
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
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };

    create.returns(SinonMongoose.stubChainedQueries([{ name: 'toto', company: companyId }], ['toObject']));

    const result = await SectorsHelper.create(payload, credentials);

    expect(result).toMatchObject({ name: 'toto', company: companyId });

    SinonMongoose.calledWithExactly(create, [
      { query: 'create', args: [{ name: 'toto', company: companyId }] },
      { query: 'toObject' },
    ]);
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
    const credentials = { company: { _id: new ObjectID() } };
    const companyId = credentials.company._id;

    find.returns(SinonMongoose.stubChainedQueries([{ name: 'toto', company: companyId }], ['lean']));

    await SectorsHelper.list(credentials);

    SinonMongoose.calledWithExactly(find, [
      { query: 'find', args: [{ company: companyId }] },
      { query: 'lean' },
    ]);
  });
});

describe('update', () => {
  let countDocuments;
  let findOneAndUpdate;
  beforeEach(() => {
    countDocuments = sinon.stub(Sector, 'countDocuments');
    findOneAndUpdate = sinon.stub(Sector, 'findOneAndUpdate');
  });
  afterEach(() => {
    countDocuments.restore();
    findOneAndUpdate.restore();
  });

  it('should update a sector', async () => {
    const payload = { name: 'Tutu' };
    const sectorId = new ObjectID();
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };

    countDocuments.returns(0);
    findOneAndUpdate.returns(SinonMongoose.stubChainedQueries([], ['lean']));

    await SectorsHelper.update(sectorId, payload, credentials);

    sinon.assert.calledOnceWithExactly(countDocuments, { name: 'Tutu', company: companyId });
    SinonMongoose.calledWithExactly(findOneAndUpdate, [
      { query: 'findOneAndUpdate', args: [{ _id: sectorId }, { $set: payload }, { new: true }] },
      { query: 'lean' },
    ]);
  });

  it('should not update sector as name already exists', async () => {
    const payload = { name: 'Tutu' };
    const sectorId = new ObjectID();
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };

    countDocuments.returns(3);

    try {
      await SectorsHelper.update(sectorId, payload, credentials);
    } catch (e) {
      expect(e.output.statusCode).toEqual(409);
    }

    sinon.assert.calledOnceWithExactly(countDocuments, { name: 'Tutu', company: companyId });
    sinon.assert.notCalled(findOneAndUpdate);
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
    const sectorId = new ObjectID();

    await SectorsHelper.remove(sectorId);

    sinon.assert.calledOnceWithExactly(deleteOne, { _id: sectorId });
  });
});
