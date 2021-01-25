const { ObjectID } = require('mongodb');
const expect = require('expect');
const sinon = require('sinon');
const InternalHour = require('../../../src/models/InternalHour');
const InternalHoursHelper = require('../../../src/helpers/internalHours');
const SinonMongoose = require('../sinonMongoose');

describe('create', () => {
  let createStub;
  beforeEach(() => {
    createStub = sinon.stub(InternalHour, 'create');
  });
  afterEach(() => {
    createStub.restore();
  });

  it('should create an internal hour', async () => {
    const payload = { name: 'skusku' };
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };

    await InternalHoursHelper.create(payload, credentials);

    sinon.assert.calledOnceWithExactly(createStub, { name: 'skusku', company: companyId });
  });
});

describe('list', () => {
  let find;
  beforeEach(() => {
    find = sinon.stub(InternalHour, 'find');
  });
  afterEach(() => {
    find.restore();
  });

  it('should return an array of every internal hour of user company', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    const internalHours = [{ _id: new ObjectID(), name: 'skusku' }];

    find.returns(SinonMongoose.stubChainedQueries([internalHours], ['lean']));

    const result = await InternalHoursHelper.list(credentials);

    expect(result).toEqual(internalHours);
    SinonMongoose.calledWithExactly(
      find,
      [{ query: 'find', args: [{ company: credentials.company._id }] }, { query: 'lean' }]
    );
  });
});

describe('removeInternalHour', () => {
  let deleteOne;
  const companyId = new ObjectID();
  beforeEach(() => {
    deleteOne = sinon.stub(InternalHour, 'deleteOne');
  });
  afterEach(() => {
    deleteOne.restore();
  });

  it('should remove an internal hour', async () => {
    const internalHour = { _id: new ObjectID(), name: 'Test', company: companyId };

    await InternalHoursHelper.removeInternalHour(internalHour);

    sinon.assert.calledWithExactly(deleteOne, { _id: internalHour._id });
  });
});
