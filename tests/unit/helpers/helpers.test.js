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
      { _id: new ObjectID(), user: { local: { email: 'helper1@test.fr' } }, customer: query.customer },
      { _id: new ObjectID(), user: { local: { email: 'helper2@test.fr' } }, customer: query.customer },
    ];

    find.returns(SinonMongoose.stubChainedQueries([helpers]));

    const result = await HelpersHelper.list(query, credentials);

    expect(result).toEqual([{ local: { email: 'helper1@test.fr' } }, { local: { email: 'helper2@test.fr' } }]);
    SinonMongoose.calledWithExactly(find, [
      { query: 'find', args: [{ customer: query.customer, company: companyId }] },
      { query: 'populate', args: [{ path: 'user', select: 'identity local contact' }] },
      { query: 'lean' },
    ]);
  });
});
