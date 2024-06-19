const { ObjectId } = require('mongodb');
const { expect } = require('expect');
const sinon = require('sinon');
const InternalHour = require('../../../src/models/InternalHour');
const InternalHoursHelper = require('../../../src/helpers/internalHours');
const SinonMongoose = require('../sinonMongoose');

describe('list', () => {
  let find;
  beforeEach(() => {
    find = sinon.stub(InternalHour, 'find');
  });
  afterEach(() => {
    find.restore();
  });

  it('should return an array of every internal hour of user company', async () => {
    const credentials = { company: { _id: new ObjectId() } };
    const internalHours = [{ _id: new ObjectId(), name: 'skusku' }];

    find.returns(SinonMongoose.stubChainedQueries(internalHours, ['lean']));

    const result = await InternalHoursHelper.list(credentials);

    expect(result).toEqual(internalHours);
    SinonMongoose.calledOnceWithExactly(
      find,
      [{ query: 'find', args: [{ company: credentials.company._id }] }, { query: 'lean' }]
    );
  });
});
