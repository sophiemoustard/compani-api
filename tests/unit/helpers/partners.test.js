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

describe('update', () => {
  let updateOne;
  beforeEach(() => {
    updateOne = sinon.stub(Partner, 'updateOne');
  });
  afterEach(() => {
    updateOne.restore();
  });

  it('should list partner from my company', async () => {
    const partnerId = new ObjectID();
    const payload = {
      identity: { firstname: 'Titouan', lastname: 'Kerouac' },
      email: 'vive+la+bretagne@alenvi.io',
      phone: '0712345678',
    };
    updateOne.returns();

    await PartnersHelper.update(partnerId, payload);

    sinon.assert.calledOnceWithExactly(
      updateOne,
      { _id: partnerId },
      {
        $set: {
          'identity.firstname': 'Titouan',
          'identity.lastname': 'Kerouac',
          email: 'vive+la+bretagne@alenvi.io',
          phone: '0712345678',
        },
      }
    );
  });
});
