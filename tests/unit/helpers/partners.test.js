const sinon = require('sinon');
const { ObjectId } = require('mongodb');
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
    const credentials = { company: { _id: new ObjectId() } };

    find.returns(SinonMongoose.stubChainedQueries([[{ _id: new ObjectId() }]], ['lean']));

    await PartnersHelper.list(credentials);

    SinonMongoose.calledOnceWithExactly(
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

  it('should update a partner', async () => {
    const partnerId = new ObjectId();
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
