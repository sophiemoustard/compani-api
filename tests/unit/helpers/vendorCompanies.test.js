const { ObjectId } = require('mongodb');
const sinon = require('sinon');
const VendorCompany = require('../../../src/models/VendorCompany');
const VendorCompaniesHelper = require('../../../src/helpers/vendorCompanies');
const SinonMongoose = require('../sinonMongoose');

describe('get', () => {
  let findOne;

  beforeEach(() => {
    findOne = sinon.stub(VendorCompany, 'findOne');
  });

  afterEach(() => {
    findOne.restore();
  });

  it('should return vendor company infos', async () => {
    const vendorCompany = {
      name: 'Company',
      billingRepresentative: {
        _id: ObjectId(),
        identity: { firstname: 'toto', lastname: 'zero' },
        contact: {},
        local: { email: 'toto@zero.io' },
      },
    };
    findOne.returns(SinonMongoose.stubChainedQueries(vendorCompany));

    await VendorCompaniesHelper.get();

    SinonMongoose.calledOnceWithExactly(
      findOne,
      [
        { query: 'findOne' },
        {
          query: 'populate',
          args: [{ path: 'billingRepresentative', select: '_id picture contact identity local' }],
        },
        { query: 'lean' },
      ]);
  });
});

describe('update', () => {
  let updateOne;

  beforeEach(() => {
    updateOne = sinon.stub(VendorCompany, 'updateOne');
  });

  afterEach(() => {
    updateOne.restore();
  });

  it('should update vendor company infos', async () => {
    const payload = { name: 'Campanil' };

    await VendorCompaniesHelper.update(payload);

    sinon.assert.calledOnceWithExactly(updateOne, {}, { $set: payload });
  });
});
