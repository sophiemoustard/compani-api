const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const Partner = require('../../../src/models/Partner');
const PartnersHelper = require('../../../src/helpers/partners');
const SinonMongoose = require('../sinonMongoose');

describe('list', () => {
  let find;
  beforeEach(() => {
    find = sinon.stub(Partner, 'find');
  });
  afterEach(() => {
    find.restore();
  });

  it('should list partner from my company', async () => {
    const credentials = { company: { _id: new ObjectID() } };

    find.returns(SinonMongoose.stubChainedQueries([[{ _id: new ObjectID() }]], ['lean']));

    await PartnersHelper.list(credentials);

    SinonMongoose.calledWithExactly(
      find,
      [{ query: 'find', args: [{ company: credentials.company._id }] }, { query: 'lean' }]
    );
  });
});
